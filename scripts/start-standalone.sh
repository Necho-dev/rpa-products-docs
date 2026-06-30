#!/usr/bin/env bash
# Next.js standalone 需同步 static/public，否则页面无 CSS/字体。
# 用法: ./scripts/start-standalone.sh [PORT]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${1:-3000}"

if [[ ! -f .next/standalone/server.js ]]; then
  echo "未找到 .next/standalone/server.js，请先运行 npm run build" >&2
  exit 1
fi

mkdir -p .next/standalone/.next
rsync -a --delete .next/static/ .next/standalone/.next/static/
if [[ -d .next/cache ]]; then
  rsync -a .next/cache/ .next/standalone/.next/cache/
fi
if [[ -d public ]]; then
  rsync -a public/ .next/standalone/public/
fi
if [[ -d src/fonts ]]; then
  mkdir -p .next/standalone/src
  rsync -a src/fonts/ .next/standalone/src/fonts/
fi

export HOSTNAME="0.0.0.0"
export PORT="$PORT"
echo "Starting standalone on http://127.0.0.1:${PORT} (static synced)"
exec node .next/standalone/server.js
