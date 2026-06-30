#!/bin/sh
# 启动前确保可观测日志目录对 nextjs(1001) 可写（Compose 宿主机 bind mount 常见为 root:root）
set -e

LOG_DIR="${DOCS_OBSERVABILITY_LOG_PATH:-/app/logs}"

if [ -n "$LOG_DIR" ]; then
  mkdir -p "$LOG_DIR"
  if ! chown -R nextjs:nodejs "$LOG_DIR" 2>/dev/null; then
    echo "[entrypoint] warning: cannot chown ${LOG_DIR}; jsonl logging may fail (host: chown 1001:1001 ${DOCS_OBSERVABILITY_LOG_PATH:-./logs})" >&2
  fi
fi

exec runuser -u nextjs -- "$@"
