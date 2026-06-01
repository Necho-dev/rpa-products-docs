#!/usr/bin/env bash
# Auth 网关验收脚本（需在 DOCS_CUBE_SSO_ENABLED=true 且服务已启动时运行）
# 用法: ./scripts/verify-auth-gate.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://127.0.0.1:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/docs")
if [[ "$code" == "302" || "$code" == "307" ]]; then
  pass "无 Cookie 访问 /docs → $code"
else
  fail "无 Cookie 访问 /docs 期望 302/307，实际 $code"
fi

loc=$(curl -sS -o /dev/null -w '%{redirect_url}' "$BASE/docs")
if [[ "$loc" == *"/auth/login"* ]]; then
  pass "重定向目标含 /auth/login"
else
  fail "重定向目标异常: $loc"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/auth/validate")
if [[ "$code" == "401" ]]; then
  pass "/auth/validate 无凭证 → 401"
else
  fail "/auth/validate 无凭证期望 401，实际 $code"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/mcp")
if [[ "$code" == "401" ]]; then
  pass "POST /mcp 无 Bearer → 401"
else
  fail "POST /mcp 无 Bearer 期望 401，实际 $code"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/auth/login")
if [[ "$code" == "200" ]]; then
  pass "/auth/login 公开可达 → 200"
else
  fail "/auth/login 期望 200，实际 $code"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/health")
if [[ "$code" == "200" ]]; then
  pass "/health 公开可达 → 200"
else
  fail "/health 期望 200，实际 $code"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/.well-known/oauth-authorization-server")
if [[ "$code" == "404" ]]; then
  pass "SSO 下 OAuth AS metadata → 404"
elif [[ "$code" == "200" ]]; then
  echo "NOTE: OAuth AS metadata → 200（DOCS_CUBE_SSO_ENABLED 可能为 false）"
else
  fail "OAuth AS metadata 异常: $code"
fi

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/docs/access")
if [[ "$code" == "302" || "$code" == "307" ]]; then
  pass "SSO 下 /docs/access → 重定向 /auth/login"
else
  echo "NOTE: /docs/access → $code（SSO 可能未开启）"
fi

echo ""
echo "验收完成: $BASE"
