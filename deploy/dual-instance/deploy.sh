#!/bin/bash
set -euo pipefail

# 一镜像两容器：检查主仓 / auth submodule，有更新则一次 build 并滚动 intranet + production。
# 默认仓库根 = 本脚本的 ../.. ；1Panel 可设 DEPLOY_PATH。
# 不调用仓库根 scripts/deplpy.sh。
# --force：跳过 Git 更新检查，按当前工作区直接构建启动（首次配置 / 手动重建）。

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${DEPLOY_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
DUAL_DIR="$REPO_ROOT/deploy/dual-instance"
BRANCH="${BRANCH:-main}"
FORCE=0

usage() {
  cat <<'EOF'
用法: deploy.sh [--force]

  默认      仅当主仓或 auth submodule 相对 origin 有更新时才构建
  --force   跳过 Git 更新检查，按当前工作区构建并启动两个容器
            （首次配置、或本地/服务器上手动重建）

环境变量: DEPLOY_PATH  BRANCH  AUTH_BRANCH  HEALTH_WAIT_SECONDS
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

SUBMODULES=(
  "content/docs/auth|${AUTH_BRANCH:-main}"
)

log() { echo ">>> $*" >&2; }
log_sentry() { echo ">>> [Sentry] $*" >&2; }

read_dotenv_value() {
  local file="$1" key="$2" line raw
  [ -f "$file" ] || return 1
  line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 || true)"
  [ -n "$line" ] || return 1
  raw="${line#*=}"
  raw="${raw%$'\r'}"
  if [[ "$raw" =~ ^\"(.*)\"$ ]]; then
    raw="${BASH_REMATCH[1]}"
  elif [[ "$raw" =~ ^\'(.*)\'$ ]]; then
    raw="${BASH_REMATCH[1]}"
  fi
  raw="$(printf '%s' "$raw" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [ -n "$raw" ] || return 1
  printf '%s' "$raw"
}

sentry_dsn_host() {
  local dsn="$1"
  if [[ "$dsn" =~ ^https?://[^@]+@([^/]+)/ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

require_env_files() {
  local name
  for name in .env .env.intranet .env.production; do
    if [ ! -f "$DUAL_DIR/$name" ]; then
      echo "缺少 $DUAL_DIR/$name" >&2
      echo "请先: cd $DUAL_DIR && cp ${name}.example ${name}" >&2
      exit 1
    fi
  done
}

export_compose_build_env() {
  local key value
  for key in \
    SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT SENTRY_URL \
    COMPOSE_IMAGE COMPOSE_PROJECT_NAME \
    INTRANET_PORT PRODUCTION_PORT \
    INTRANET_LOG_PATH PRODUCTION_LOG_PATH PRODUCTION_SECRETS_DIR
  do
    value="$(read_dotenv_value "$DUAL_DIR/.env" "$key" 2>/dev/null || true)"
    if [ -n "$value" ]; then
      export "${key}=${value}"
    fi
  done

  if command -v git >/dev/null 2>&1; then
    GIT_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
  else
    GIT_SHA=""
  fi
  if [ -n "$GIT_SHA" ]; then
    export GIT_SHA
    export SENTRY_RELEASE="$GIT_SHA"
    log_sentry "构建 release: ${GIT_SHA}"
  else
    unset GIT_SHA SENTRY_RELEASE 2>/dev/null || true
    log_sentry "警告: 无法 git rev-parse HEAD，本构建不会写入 Sentry release"
  fi
}

warn_instance_sentry_dsn() {
  local label="$1" file="$2"
  local dsn=""
  dsn="$(read_dotenv_value "$file" SENTRY_DSN 2>/dev/null || true)"
  if [ -z "$dsn" ]; then
    log_sentry "[$label] 未配置 SENTRY_DSN：该实例 Errors / Replay / Logs 关闭（改实例 env 后 compose up -d 即可，不必 --build）"
    return 0
  fi
  if ! sentry_dsn_host "$dsn" >/dev/null; then
    log_sentry "[$label] 警告: SENTRY_DSN 格式无效（期望 https://<key>@<host>/<project>）"
  else
    log_sentry "[$label] 运行时 DSN 已配置；换 DSN 只需重启，无需重建"
  fi
}

warn_runtime_sentry() {
  warn_instance_sentry_dsn intranet "$DUAL_DIR/.env.intranet"
  warn_instance_sentry_dsn production "$DUAL_DIR/.env.production"
  local token=""
  token="$(read_dotenv_value "$DUAL_DIR/.env" SENTRY_AUTH_TOKEN 2>/dev/null || true)"
  if [ -n "$token" ]; then
    log_sentry "已配置 SENTRY_AUTH_TOKEN：本次 next build 将尝试上传 source map"
  else
    log_sentry "未配置 SENTRY_AUTH_TOKEN：跳过 source map 上传（按需再带）"
  fi
}

compose() {
  docker compose --project-directory "$DUAL_DIR" -f "$DUAL_DIR/docker-compose.yml" "$@"
}

compose_image_ref() {
  printf '%s' "${COMPOSE_IMAGE:-yuce-knowledge-docs:latest}"
}

compose_image_repo() {
  local image
  image="$(compose_image_ref)"
  printf '%s' "${image%:*}"
}

previous_image_ref() {
  printf '%s:previous' "$(compose_image_repo)"
}

image_id() {
  docker image inspect -f '{{.Id}}' "$1" 2>/dev/null || true
}

# 构建前把正在用的 :latest 另打 :previous，失败时可回退；构建中勿 prune。
reserve_previous_image() {
  local image prev
  image="$(compose_image_ref)"
  prev="$(previous_image_ref)"
  if docker image inspect "$image" >/dev/null 2>&1; then
    docker tag "$image" "$prev"
    log "已保留回退镜像: $prev"
  else
    log "无现有 ${image}，跳过回退保留（首次构建）"
  fi
}

wait_services_healthy() {
  local name status
  local timeout="${HEALTH_WAIT_SECONDS:-180}"
  local deadline=$((SECONDS + timeout))
  local containers=(yuce-knowledge-docs-intranet yuce-knowledge-docs-production)
  for name in "${containers[@]}"; do
    while true; do
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || echo missing)"
      if [ "$status" = "healthy" ]; then
        log "${name} 已 healthy"
        break
      fi
      if [ "$status" = "unhealthy" ] || [ "$status" = "exited" ] || [ "$status" = "dead" ] || [ "$status" = "missing" ]; then
        log "${name} 状态异常: ${status}"
        return 1
      fi
      if [ "$SECONDS" -ge "$deadline" ]; then
        log "${name} 等待健康检查超时（${timeout}s），当前: ${status}"
        return 1
      fi
      sleep 3
    done
  done
  return 0
}

# 成功后只留 COMPOSE_IMAGE，去掉 :previous 与同仓库其它标签，并清dangling / 未用构建缓存。
keep_only_latest_image() {
  local image repo prev tag
  image="$(compose_image_ref)"
  repo="$(compose_image_repo)"
  prev="$(previous_image_ref)"

  if docker image inspect "$prev" >/dev/null 2>&1; then
    if [ "$(image_id "$prev")" = "$(image_id "$image")" ]; then
      docker image rm "$prev" >/dev/null 2>&1 || true
    else
      log "删除回退镜像: $prev"
      docker image rm "$prev" || true
    fi
  fi

  while IFS= read -r tag; do
    [ -n "$tag" ] || continue
    [ "$tag" = "$image" ] && continue
    [[ "$tag" == *':<none>' ]] && continue
    log "删除同仓库多余标签: $tag"
    docker image rm "$tag" || true
  done < <(docker images --format '{{.Repository}}:{{.Tag}}' --filter "reference=${repo}" 2>/dev/null || true)

  docker image prune -f
  docker builder prune -f >/dev/null
  log "镜像清理完成，仅保留 ${image}"
}

rollback_to_previous() {
  local image prev
  image="$(compose_image_ref)"
  prev="$(previous_image_ref)"
  if ! docker image inspect "$prev" >/dev/null 2>&1; then
    log "没有回退镜像 ${prev}，无法自动回退"
    return 1
  fi
  log "新实例未就绪，回退到 ${prev}"
  docker tag "$prev" "$image"
  compose up -d
  if wait_services_healthy; then
    keep_only_latest_image
    return 0
  fi
  log "回退后再探活仍失败"
  return 1
}

cd "$REPO_ROOT" || { echo "仓库根不存在: $REPO_ROOT"; exit 1; }
require_env_files

echo "==================== $(date '+%Y-%m-%d %H:%M:%S') 检查更新 ================"
log "仓库根: $REPO_ROOT"
log "Compose: $DUAL_DIR"

NEED_UPDATE=0
MAIN_CHANGED=0

if [ "$FORCE" -eq 1 ]; then
  log "--force：跳过 Git 更新检查，按当前工作区构建"
  git submodule update --init --recursive
  export_compose_build_env
  NEED_UPDATE=1
else
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$current_branch" != "$BRANCH" ]; then
    log "当前分支为 $current_branch，切换到 $BRANCH"
    git checkout "$BRANCH"
  fi

  git fetch origin "$BRANCH"
  git submodule update --init --recursive

  export_compose_build_env

  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse "origin/$BRANCH")"
  if [ "$LOCAL" != "$REMOTE" ]; then
    log "主仓库有更新: ${LOCAL:0:8} -> ${REMOTE:0:8} (origin/$BRANCH)"
    NEED_UPDATE=1
    MAIN_CHANGED=1
  fi

  for entry in "${SUBMODULES[@]}"; do
    path="${entry%%|*}"
    branch="${entry#*|}"
    if [ ! -d "$path/.git" ] && [ ! -f "$path/.git" ]; then
      log "Submodule 未初始化: $path，将在更新阶段拉取"
      NEED_UPDATE=1
      continue
    fi
    git -C "$path" fetch origin "$branch"
    sub_local="$(git -C "$path" rev-parse HEAD)"
    sub_remote="$(git -C "$path" rev-parse "origin/$branch")"
    if [ "$sub_local" != "$sub_remote" ]; then
      log "Submodule 有更新 [$path]: ${sub_local:0:8} -> ${sub_remote:0:8} (origin/$branch)"
      NEED_UPDATE=1
    fi
  done

  if [ "$MAIN_CHANGED" -eq 1 ]; then
    log "拉取主仓库 origin/$BRANCH"
    git pull --ff-only origin "$BRANCH"
    export_compose_build_env
  fi
fi

log_sentry "运行时配置..."
warn_runtime_sentry

if [ "$NEED_UPDATE" -eq 1 ]; then
  log "开始执行更新流程"

  if [ "$FORCE" -eq 0 ]; then
    for entry in "${SUBMODULES[@]}"; do
      path="${entry%%|*}"
      branch="${entry#*|}"
      git config -f .gitmodules "submodule.$path.branch" "$branch"
      git submodule sync -- "$path"
      git submodule update --init --remote -- "$path"
    done
  fi

  log "一次构建镜像并滚动更新 intranet + production"
  reserve_previous_image
  compose up -d --build
  if wait_services_healthy; then
    log "双实例已就绪，只保留最新镜像"
    keep_only_latest_image
    log "双实例更新完成"
  else
    if rollback_to_previous; then
      log "已回退到上一版镜像并恢复服务"
    else
      log "更新失败且无法回退，请检查容器日志"
    fi
    exit 1
  fi
else
  log "代码无变更，跳过构建与重启"
fi
