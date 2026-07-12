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

cd "$DEPLOY_PATH" || { echo "目录不存在，任务终止"; exit 1; }

echo "==================== $(date '+%Y-%m-%d %H:%M:%S') 检查更新 ================"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "$BRANCH" ]; then
  echo ">>> 当前分支为 $current_branch，切换到 $BRANCH"
  git checkout "$BRANCH"
fi

git fetch origin "$BRANCH"
git submodule update --init --recursive

NEED_UPDATE=0
MAIN_CHANGED=0

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL" != "$REMOTE" ]; then
  echo ">>> 主仓库有更新: ${LOCAL:0:8} -> ${REMOTE:0:8} (origin/$BRANCH)"
  NEED_UPDATE=1
  MAIN_CHANGED=1
fi

for entry in "${SUBMODULES[@]}"; do
  path="${entry%%|*}"
  branch="${entry#*|}"
  if [ ! -d "$path/.git" ] && [ ! -f "$path/.git" ]; then
    echo ">>> Submodule 未初始化: $path，将在更新阶段拉取"
    NEED_UPDATE=1
    continue
  fi
  git -C "$path" fetch origin "$branch"
  sub_local="$(git -C "$path" rev-parse HEAD)"
  sub_remote="$(git -C "$path" rev-parse "origin/$branch")"
  if [ "$sub_local" != "$sub_remote" ]; then
    echo ">>> Submodule 有更新 [$path]: ${sub_local:0:8} -> ${sub_remote:0:8} (origin/$branch)"
    NEED_UPDATE=1
  fi
done

if [ "$NEED_UPDATE" -eq 1 ]; then
  echo ">>> 开始执行更新流程"
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

  echo ">>> 开始构建镜像并滚动更新容器"
  docker compose up -d --build
  echo ">>> 清理无用镜像"
  docker image prune -f
  echo ">>> 文档站更新完成"
else
  echo ">>> 代码无变更，跳过构建与重启"
fi
