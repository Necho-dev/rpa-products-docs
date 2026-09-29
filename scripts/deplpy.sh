#!/bin/bash
set -euo pipefail

# 部署目录与主仓分支（可用环境变量覆盖，便于 1Panel 配置）
# --force：跳过 Git 更新检查，按当前工作区直接构建启动（首次配置 / 手动重建）。
DEPLOY_PATH="${DEPLOY_PATH:-/opt/1panel/apps/rpa-products-docs}"
BRANCH="${BRANCH:-main}"
FORCE=0
ORIG_ARGS=("$@")

usage() {
  cat <<'EOF'
用法: deplpy.sh [--force]

  默认      远端提交与最近一次成功发布不一致时才构建
            （含主仓、子模块有更新，以及上次构建失败后的重试）
  --force   跳过 Git 更新检查，按当前工作区构建并启动
            （首次配置、或本地/服务器上手动重建）

环境变量: DEPLOY_PATH  BRANCH  AUTH_BRANCH  API_DOCS_BRANCH  HEALTH_WAIT_SECONDS
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

# 按 .vendor/mounts 稀疏检出并挂载。新克隆时把 NEED_UPDATE 置 1。
sync_vendor() {
  local out
  out="$(bash "$DEPLOY_PATH/scripts/sync-vendor.sh")"
  if [ "$out" = "initialized" ]; then
    log ".vendor 子模块是新克隆的，将构建镜像"
    NEED_UPDATE=1
  fi
}

log() { echo ">>> $*" >&2; }
log_sentry() { echo ">>> [Sentry] $*" >&2; }

# 子模块以当前 .gitmodules 为准。AUTH_BRANCH / API_DOCS_BRANCH 只覆盖对应路径。
# .vendor/ 走稀疏克隆，不用 git submodule update --init，避免拉下整个远程仓库。
submodule_present() {
  [ -e "$1/.git" ]
}

is_vendor_submodule() {
  case "$1" in
    .vendor/*) return 0 ;;
    *) return 1 ;;
  esac
}

branch_override() {
  local path="$1" branch="$2"
  case "$path" in
    content/docs/auth) printf '%s' "${AUTH_BRANCH:-$branch}" ;;
    .vendor/dc-knowledge) printf '%s' "${API_DOCS_BRANCH:-$branch}" ;;
    *) printf '%s' "$branch" ;;
  esac
}

load_submodules() {
  local key path name branch
  SUBMODULES=()
  [ -f .gitmodules ] || return 0
  while read -r key path; do
    [ -n "${path:-}" ] || continue
    name="${key#submodule.}"
    name="${name%.path}"
    branch="$(git config -f .gitmodules --get "submodule.${name}.branch" || true)"
    branch="$(branch_override "$path" "${branch:-main}")"
    SUBMODULES+=("${path}|${branch}")
  done < <(git config -f .gitmodules --get-regexp '^submodule\..*\.path$' || true)
  if [ "${#SUBMODULES[@]}" -eq 0 ]; then
    log ".gitmodules 中没有子模块"
  else
    log "子模块清单: ${SUBMODULES[*]}"
  fi
}

note_submodule_drift() {
  local path="$1" branch="$2" sub_local sub_remote
  if ! submodule_present "$path"; then
    log "Submodule 未初始化: $path，将首次拉取 ($branch)"
    NEED_UPDATE=1
    return
  fi
  if is_vendor_submodule "$path"; then
    git -C "$path" fetch --depth 1 origin "$branch"
  else
    git -C "$path" fetch origin "$branch"
  fi
  sub_local="$(git -C "$path" rev-parse HEAD)"
  sub_remote="$(git -C "$path" rev-parse "origin/$branch")"
  if [ "$sub_local" != "$sub_remote" ]; then
    log "Submodule 有更新 [$path]: ${sub_local:0:8} -> ${sub_remote:0:8} (origin/$branch)"
    NEED_UPDATE=1
  fi
}

update_one_submodule() {
  local path="$1" branch="$2"
  if is_vendor_submodule "$path"; then
    if submodule_present "$path"; then
      log "更新稀疏子模块 $path ($branch)"
      git -C "$path" fetch --depth 1 origin "$branch"
      git -C "$path" reset --hard "origin/$branch"
    else
      log "稀疏子模块 $path 将由 sync-vendor.sh 首次克隆"
    fi
    return
  fi
  log "同步子模块 $path ($branch)"
  git config -f .gitmodules "submodule.$path.branch" "$branch"
  git submodule sync -- "$path"
  git submodule update --init --remote -- "$path"
}

sync_all_submodules() {
  local entry path branch
  load_submodules
  if [ "${#SUBMODULES[@]}" -gt 0 ]; then
    for entry in "${SUBMODULES[@]}"; do
      path="${entry%%|*}"
      branch="${entry#*|}"
      update_one_submodule "$path" "$branch"
    done
  fi
  sync_vendor
}

# 只在探活成功后写入。构建失败不更新，下次即使 Git 已对齐也会重试。
BUILD_LOCK="$DEPLOY_PATH/.build.lock"

# mode=origin：已 fetch 的远端提交；mode=head：当前检出（成功构建后写入）
release_id() {
  local mode="$1" entry path branch sha
  {
    if [ "$mode" = origin ]; then
      sha="$(git rev-parse "origin/$BRANCH")"
    else
      sha="$(git rev-parse HEAD)"
    fi
    printf 'main %s\n' "$sha"
    if [ "${#SUBMODULES[@]}" -gt 0 ]; then
      for entry in "${SUBMODULES[@]}"; do
        path="${entry%%|*}"
        branch="${entry#*|}"
        if ! submodule_present "$path"; then
          printf '%s missing\n' "$path"
          continue
        fi
        if [ "$mode" = origin ]; then
          sha="$(git -C "$path" rev-parse "origin/$branch")"
        else
          sha="$(git -C "$path" rev-parse HEAD)"
        fi
        printf '%s %s\n' "$path" "$sha"
      done
    fi
  } | LC_ALL=C sort
}

build_lock_matches_origin() {
  [ -f "$BUILD_LOCK" ] || return 1
  [ "$(release_id origin)" = "$(cat "$BUILD_LOCK")" ]
}

write_build_lock() {
  local tmp
  tmp="$(mktemp "$DEPLOY_PATH/.build.lock.XXXXXX")"
  release_id head > "$tmp"
  mv "$tmp" "$BUILD_LOCK"
  log "已记录成功发布 $(git rev-parse --short HEAD)"
}

# 从 dotenv 文件读取 KEY=value（忽略注释/空行；不 source，避免执行）
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

# 从 DSN 解析 host：https://key@host/project → host
sentry_dsn_host() {
  local dsn="$1"
  if [[ "$dsn" =~ ^https?://[^@]+@([^/]+)/ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

# 将 .env 中构建相关键导出到当前 shell（source map / 镜像名 / 端口）。
# DSN 与 KNOWLEDGE_SITE_* 只走容器运行时 env_file，不作为 build-arg。
export_compose_build_env() {
  local key value
  for key in \
    SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT SENTRY_URL \
    COMPOSE_IMAGE COMPOSE_CONTAINER_NAME PORT DOCS_SECRETS_DIR DOCS_OBSERVABILITY_LOG_PATH
  do
    value="$(read_dotenv_value .env "$key" 2>/dev/null || true)"
    if [ -n "$value" ]; then
      export "${key}=${value}"
    fi
  done

  # release / git.sha：构建时自动生成，不读 .env（避免手填漂移）
  if command -v git >/dev/null 2>&1; then
    GIT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
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

# 运行时 DSN 提示（不强制重建）。stdout 仅输出: ok
warn_runtime_sentry_dsn() {
  local env_file=".env" local_file=".env.local"
  local dsn="" token=""

  dsn="$(read_dotenv_value "$env_file" SENTRY_DSN 2>/dev/null || true)"
  if [ -z "$dsn" ]; then
    dsn="$(read_dotenv_value "$local_file" SENTRY_DSN 2>/dev/null || true)"
  fi

  if [ -z "$dsn" ]; then
    log_sentry "未配置 SENTRY_DSN：运行时 Errors / Replay / Logs 关闭（改 .env 后重启容器即可，不必 --build）"
    printf 'ok'
    return 0
  fi

  if ! sentry_dsn_host "$dsn" >/dev/null; then
    log_sentry "警告: SENTRY_DSN 格式无效（期望 https://<key>@<host>/<project>），Sentry 可能无法上报"
  else
    log_sentry "运行时 DSN 已配置；换 DSN 只需重启，无需重建"
  fi

  token="$(read_dotenv_value "$env_file" SENTRY_AUTH_TOKEN 2>/dev/null || true)"
  if [ -n "$token" ]; then
    log_sentry "已配置 SENTRY_AUTH_TOKEN：本次 next build 将尝试上传 source map"
  else
    log_sentry "未配置 SENTRY_AUTH_TOKEN：跳过 source map 上传（按需再带）"
  fi
  printf 'ok'
}

compose_image_ref() {
  printf '%s' "${COMPOSE_IMAGE:-yuce-knowledge-docs:local}"
}

compose_image_repo() {
  local image
  image="$(compose_image_ref)"
  printf '%s' "${image%:*}"
}

previous_image_ref() {
  printf '%s:previous' "$(compose_image_repo)"
}

compose_container_ref() {
  printf '%s' "${COMPOSE_CONTAINER_NAME:-yuce-knowledge-docs}"
}

image_id() {
  docker image inspect -f '{{.Id}}' "$1" 2>/dev/null || true
}

# 构建前把正在用的镜像另打 :previous，失败时可回退；构建中勿 prune。
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

wait_service_healthy() {
  local name status
  local timeout="${HEALTH_WAIT_SECONDS:-180}"
  local deadline=$((SECONDS + timeout))
  name="$(compose_container_ref)"
  while true; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || echo missing)"
    if [ "$status" = "healthy" ]; then
      log "${name} 已 healthy"
      return 0
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
}

# 成功后只留 COMPOSE_IMAGE，去掉 :previous 与同仓库其它标签。
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
  docker compose up -d
  if wait_service_healthy; then
    keep_only_latest_image
    return 0
  fi
  log "回退后再探活仍失败"
  return 1
}

cd "$DEPLOY_PATH" || { echo "目录不存在，任务终止"; exit 1; }

echo "==================== $(date '+%Y-%m-%d %H:%M:%S') 检查更新 ================"

NEED_UPDATE=0
MAIN_CHANGED=0

if [ "$FORCE" -eq 1 ]; then
  log "--force：跳过 Git 更新检查，按当前工作区构建"
  export_compose_build_env
  sync_all_submodules
  NEED_UPDATE=1
else
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$current_branch" != "$BRANCH" ]; then
    log "当前分支为 $current_branch，切换到 $BRANCH"
    git checkout "$BRANCH"
  fi

  git fetch origin "$BRANCH"
  # 先导出 .env，避免 cron 空变量盖掉 Compose build.args 插值
  export_compose_build_env

  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse "origin/$BRANCH")"
  if [ "$LOCAL" != "$REMOTE" ]; then
    log "主仓库有更新: ${LOCAL:0:8} -> ${REMOTE:0:8} (origin/$BRANCH)"
    NEED_UPDATE=1
    MAIN_CHANGED=1
  fi

  # 先拉取主仓，避免预检逻辑本身有 bug 时永远 pull 不到修复
  if [ "$MAIN_CHANGED" -eq 1 ]; then
    log "拉取主仓库 origin/$BRANCH"
    git pull --ff-only origin "$BRANCH"
    export_compose_build_env
    if [ "${DEPLOY_REEXEC:-0}" != 1 ]; then
      log "主仓库已更新，重新执行部署脚本以识别新增子模块"
      export DEPLOY_REEXEC=1
      export DEPLOY_AFTER_PULL=1
      exec "$0" "${ORIG_ARGS[@]}"
    fi
  fi

  if [ "${DEPLOY_AFTER_PULL:-0}" = 1 ]; then
    log "续跑：主仓库已拉取，继续同步子模块并构建"
    NEED_UPDATE=1
  fi

  load_submodules
  if [ "${#SUBMODULES[@]}" -gt 0 ]; then
    for entry in "${SUBMODULES[@]}"; do
      note_submodule_drift "${entry%%|*}" "${entry#*|}"
    done
  fi

  if ! build_lock_matches_origin; then
    if [ -f "$BUILD_LOCK" ]; then
      log "当前远端提交尚未成功发布，将重新构建"
    else
      log "没有成功发布记录，将构建"
    fi
    NEED_UPDATE=1
  fi
fi

log_sentry "运行时配置..."
warn_runtime_sentry_dsn >/dev/null

if [ "$NEED_UPDATE" -eq 1 ]; then
  log "开始执行更新流程"

  if [ "$FORCE" -eq 0 ]; then
    sync_all_submodules
  fi

  log "开始构建镜像并滚动更新容器"
  reserve_previous_image
  docker compose up -d --build
  if wait_service_healthy; then
    log "容器已就绪，只保留最新镜像"
    keep_only_latest_image
    write_build_lock
    log "文档站更新完成"
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
