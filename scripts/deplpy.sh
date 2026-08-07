#!/bin/bash
set -euo pipefail

# 部署目录与主仓分支（可用环境变量覆盖，便于 1Panel 配置）
DEPLOY_PATH="${DEPLOY_PATH:-/opt/1panel/apps/rpa-products-docs}"
BRANCH="${BRANCH:-main}"

# 每项格式：相对路径|跟踪分支
# 环境变量可覆盖单条分支；日后加其它 Submodule 时追加一行即可，例如：
#   "content/docs/rpa|${RPA_BRANCH:-main}"
SUBMODULES=(
  "content/docs/auth|${AUTH_BRANCH:-main}"
)

log() { echo ">>> $*" >&2; }
log_sentry() { echo ">>> [Sentry] $*" >&2; }

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

# Compose 插值后的 build.args.SENTRY_DSN
compose_build_arg_sentry_dsn() {
  docker compose config 2>/dev/null \
    | awk '
      $1 == "build:" { in_build=1; next }
      in_build && /^[[:space:]]*args:/ { in_args=1; next }
      in_build && in_args && $1 ~ /^SENTRY_DSN:/ {
        sub(/^[[:space:]]*SENTRY_DSN:[[:space:]]*/, "")
        gsub(/"/, "")
        print
        exit
      }
      in_build && /^[[:space:]]*[a-z]/ { in_build=0; in_args=0 }
    '
}

# 当前镜像客户端/服务端产物是否已内联 Sentry host
image_has_sentry_host() {
  local host="$1"
  docker compose run --rm --no-deps --entrypoint sh docs -c \
    "grep -rqF '${host}' /app/.next/static /app/.next/server 2>/dev/null" \
    >/dev/null 2>&1
}

# 构建前检查。stdout 仅输出: ok | force | skip；日志走 stderr。
# 返回 2 表示配置错误应中止部署。
check_sentry_preflight() {
  local env_file=".env" local_file=".env.local"
  local dsn_env="" dsn_local="" dsn="" host="" build_dsn="" sentry_env=""

  dsn_env="$(read_dotenv_value "$env_file" SENTRY_DSN 2>/dev/null || true)"
  dsn_local="$(read_dotenv_value "$local_file" SENTRY_DSN 2>/dev/null || true)"

  if [ -z "$dsn_env" ] && [ -n "$dsn_local" ]; then
    log_sentry "错误: SENTRY_DSN 只写在 .env.local，Compose build.args 读不到"
    log_sentry "请把 SENTRY_DSN / SENTRY_ENVIRONMENT 写到项目根 .env 后重试"
    return 2
  fi

  if [ -z "$dsn_env" ]; then
    log_sentry "未配置 .env 中的 SENTRY_DSN：客户端 Replay / 浏览器 Trace 将关闭"
    printf 'skip'
    return 0
  fi

  dsn="$dsn_env"
  if ! host="$(sentry_dsn_host "$dsn")"; then
    log_sentry "错误: SENTRY_DSN 格式无效（期望 https://<key>@<host>/<project>）"
    return 2
  fi

  build_dsn="$(compose_build_arg_sentry_dsn || true)"
  if [ -z "$build_dsn" ]; then
    log_sentry "错误: docker compose config 的 build.args.SENTRY_DSN 为空"
    log_sentry "确认 .env 存在且含未注释的 SENTRY_DSN=..."
    return 2
  fi
  if [ "$build_dsn" != "$dsn" ]; then
    log_sentry "警告: .env 与 compose build.args 的 SENTRY_DSN 不一致"
  fi

  sentry_env="$(read_dotenv_value "$env_file" SENTRY_ENVIRONMENT 2>/dev/null || true)"
  log_sentry "预检通过: host=${host} environment=${sentry_env:-dev}（将打入 next build）"

  if image_has_sentry_host "$host"; then
    log_sentry "当前镜像已内联 DSN host，无需因 Sentry 强制重建"
    printf 'ok'
  else
    log_sentry "当前镜像未内联 DSN（或尚无镜像）→ 将强制 --build，否则 Replay/浏览器 Trace 不可用"
    printf 'force'
  fi
  return 0
}

# 构建后校验：产物必须能 grep 到 DSN host
verify_sentry_in_image() {
  local env_file=".env" dsn host
  dsn="$(read_dotenv_value "$env_file" SENTRY_DSN 2>/dev/null || true)"
  [ -n "$dsn" ] || return 0
  host="$(sentry_dsn_host "$dsn")" || return 0

  log_sentry "校验镜像是否内联 DSN host=${host}"
  if image_has_sentry_host "$host"; then
    log_sentry "校验通过：/app/.next/static|server 已包含 ${host}"
    return 0
  fi

  log_sentry "错误: 构建后仍未在镜像中找到 ${host}"
  log_sentry "请检查 Dockerfile build-arg / next.config env，并确认使用了 --build"
  return 1
}

cd "$DEPLOY_PATH" || { echo "目录不存在，任务终止"; exit 1; }

echo "==================== $(date '+%Y-%m-%d %H:%M:%S') 检查更新 ================"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "$BRANCH" ]; then
  log "当前分支为 $current_branch，切换到 $BRANCH"
  git checkout "$BRANCH"
fi

git fetch origin "$BRANCH"
git submodule update --init --recursive

NEED_UPDATE=0
MAIN_CHANGED=0
SENTRY_FORCE=0

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

log_sentry "构建预检..."
set +e
SENTRY_PREFLIGHT="$(check_sentry_preflight)"
SENTRY_PREFLIGHT_RC=$?
set -e
if [ "$SENTRY_PREFLIGHT_RC" -eq 2 ]; then
  exit 1
fi
if [ "$SENTRY_PREFLIGHT" = "force" ]; then
  SENTRY_FORCE=1
  NEED_UPDATE=1
fi

if [ "$NEED_UPDATE" -eq 1 ]; then
  log "开始执行更新流程"
  if [ "$MAIN_CHANGED" -eq 1 ]; then
    git pull --ff-only origin "$BRANCH"
  fi

  for entry in "${SUBMODULES[@]}"; do
    path="${entry%%|*}"
    branch="${entry#*|}"
    git config -f .gitmodules "submodule.$path.branch" "$branch"
    git submodule sync -- "$path"
    git submodule update --init --remote -- "$path"
  done

  if [ "$SENTRY_FORCE" -eq 1 ] && [ "$MAIN_CHANGED" -eq 0 ]; then
    log "本次因 Sentry DSN 未打进镜像而强制重建（代码可能无变更）"
  fi

  log "开始构建镜像并滚动更新容器"
  docker compose up -d --build
  log "清理无用镜像"
  docker image prune -f

  verify_sentry_in_image

  log "文档站更新完成"
else
  log "代码无变更，跳过构建与重启"
  if [ "$SENTRY_PREFLIGHT" = "ok" ]; then
    log_sentry "镜像 DSN 内联状态正常"
  fi
fi
