#!/usr/bin/env bash
# 生产级 Auth / 嵌入 / UA 门禁验收（需 DOCS_CUBE_SSO_ENABLED=true 且服务已启动）
#
# 用法:
#   ./scripts/verify-prod-gates.sh [BASE_URL]
#
# UA 门禁专项（需服务端 DOCS_USER_AGENT_GATE_ENABLED=true）:
#   DOCS_USER_AGENT_GATE_ENABLED=true npm run start
#   ./scripts/verify-prod-gates.sh
#
set -euo pipefail

BASE="${1:-http://127.0.0.1:3000}"
SECRETS_FILE="${DOCS_SECRETS_FILE_PATH:-.secrets/dev-secrets.json}"
CUBE_ORIGIN="${MOCK_CUBE_BASE_HOST:-http://127.0.0.1:8765}"

BROWSER_UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
DOC_PATH='/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-quality-score-list'
IMG_PATH='/resources/images/rpa/_public/images/qianniu/item_quality_score_list_20260521.png'

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }
note() { echo "NOTE: $*"; }

curl_code() {
  curl -sS -o /dev/null -w '%{http_code}' "$@"
}

curl_code_ua() {
  curl -sS -o /dev/null -w '%{http_code}' -H "User-Agent: ${BROWSER_UA}" "$@"
}

# --- SSO 门禁 ---
code=$(curl_code "$BASE/docs")
[[ "$code" == "302" || "$code" == "307" ]] && pass "SSO: 无 Cookie /docs → $code" || fail "SSO /docs 期望 302/307，实际 $code"

loc=$(curl -sS -o /dev/null -w '%{redirect_url}' "$BASE/docs")
[[ "$loc" == *"/auth/login"* ]] && pass "SSO: 重定向含 /auth/login" || fail "SSO 重定向异常: $loc"

code=$(curl_code "$BASE/auth/validate")
[[ "$code" == "401" ]] && pass "SSO: /auth/validate 无凭证 → 401" || fail "/auth/validate 期望 401，实际 $code"

code=$(curl_code -X POST "$BASE/mcp")
[[ "$code" == "401" ]] && pass "SSO: POST /mcp 无 Bearer → 401" || fail "POST /mcp 期望 401，实际 $code"

code=$(curl_code "$BASE/auth/login")
[[ "$code" == "200" ]] && pass "SSO: /auth/login 公开 → 200" || fail "/auth/login 期望 200，实际 $code"

code=$(curl_code "$BASE/health")
[[ "$code" == "200" ]] && pass "SSO: /health 公开 → 200" || fail "/health 期望 200，实际 $code"

code=$(curl_code "$BASE/llms.htm/docs/foo")
[[ "$code" == "404" ]] && pass "Embed: 直访 /llms.htm → 404" || fail "直访 /llms.htm 期望 404，实际 $code"

code=$(curl_code "$BASE${DOC_PATH}?mode=page")
[[ "$code" == "401" ]] && pass "Embed: 无签名 mode=page → 401" || fail "无签名 embed 期望 401，实际 $code"

# --- 嵌入登录包（需 secrets 文件 + 用户中心或 AES 回退） ---
if [[ -f "$SECRETS_FILE" ]]; then
  embed_qs=$(python3 - "$SECRETS_FILE" "$DOC_PATH" "$CUBE_ORIGIN" <<'PY'
import hashlib, json, sys, time, base64
from urllib.parse import urlencode
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
secrets_path, doc_path, cube_origin = sys.argv[1], sys.argv[2], sys.argv[3]
with open(secrets_path) as f:
    data = json.load(f)
sh = secret = None
for k, v in data.items():
    if k.startswith('_') or not isinstance(v, str):
        continue
    sh, secret = k, v
    break
if not sh:
    sys.exit('no secret in file')
payload = json.dumps({"userName": "verify-user", "targetUrl": doc_path, "cubeOrigin": cube_origin.rstrip("/")}, separators=(",", ":"))
key = secret.encode("ascii")
cipher = AES.new(key, AES.MODE_ECB)
ed = base64.b64encode(cipher.encrypt(pad(payload.encode("utf-8"), AES.block_size))).decode("ascii")
tm = int(time.time() * 1000)
sg = hashlib.sha256(f"{ed}{tm}{secret}".encode()).hexdigest()
print(urlencode({"mode": "page", "ed": ed, "sh": sh, "tm": str(tm), "sg": sg}))
PY
)
  embed_url="$BASE${DOC_PATH}?${embed_qs}"

  code=$(curl -sS -o /dev/null -w '%{http_code}' -H "User-Agent: httpx/0.27.0" "$embed_url")
  [[ "$code" == "200" ]] && pass "Embed: Query 登录包 → 200" || fail "嵌入期望 200，实际 $code"

  body_head=$(curl -sS "$embed_url" | head -c 40 | tr -d '\n\r')
  [[ "$body_head" == "<!DOCTYPE html>"* ]] && pass "Embed: 返回完整 HTML 文档" || fail "Embed HTML 异常: $body_head"

  img_url=$(curl -sS "$embed_url" | grep -oE 'src="[^"]*/resources/images/[^"]+\?sign=[^"]*"' | head -1 | sed 's/src="//;s/"$//' || true)
  if [[ -n "$img_url" ]]; then
    pass "Embed: HTML 内图片为文档站 ?sign= 直链"
    if [[ "$img_url" == http* ]]; then
      code=$(curl_code_ua "$img_url")
      [[ "$code" == "200" ]] && pass "Resource: 有效 sign 直连 → 200" || note "sign 直连 HTTP $code"
    else
      code=$(curl_code_ua "$BASE$img_url")
      [[ "$code" == "200" ]] && pass "Resource: 站内 ?sign= → 200" || note "站内 sign HTTP $code"
    fi
  else
    note "未解析到嵌入图片 URL，跳过 sign 测试"
  fi

  # 资源验签（仅当 DOCS_RESOURCES_REQUIRE_EMBED_SIGN=true 时严格 401）
  code=$(curl_code_ua "$BASE${IMG_PATH}")
  if [[ "$code" == "401" ]]; then
    pass "Resource: 无签名裸链 /resources/images → 401"
  elif [[ "$code" == "200" ]]; then
    note "Resource: 裸链仍可访问（未开启 DOCS_RESOURCES_REQUIRE_EMBED_SIGN）"
  else
    note "Resource: 裸链 /resources/images → $code"
  fi
else
  note "未找到 $SECRETS_FILE，跳过 BFF 嵌入签名测试"
fi

# --- User-Agent 门禁 ---
code=$(curl_code "$BASE/docs")
if [[ "$code" == "403" ]]; then
  pass "UA: curl /docs → 403（门禁已开启）"
  code=$(curl_code_ua "$BASE/docs")
  [[ "${code}" == "302" || "${code}" == "307" ]] && pass "UA: browser UA /docs -> ${code}" || fail "browser UA /docs expected 302/307, got ${code}"
  code=$(curl_code "$BASE${IMG_PATH}")
  [[ "$code" == "403" ]] && pass "UA: curl 拉取图片 → 403" || fail "curl 图片期望 403，实际 $code"
  code=$(curl_code_ua "$BASE${IMG_PATH}")
  [[ "$code" == "200" ]] && pass "UA: 浏览器 UA 拉取图片 → 200" || fail "浏览器图片期望 200，实际 $code"
elif [[ "$code" == "302" || "$code" == "307" ]]; then
  note "UA gate OFF (curl /docs -> ${code}); set DOCS_USER_AGENT_GATE_ENABLED=true in prod"
else
  fail "UA/SSO /docs 异常状态码: $code"
fi

# --- MCP / llms export exempt ---
code=$(curl_code "$BASE/llms.mdx/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-quality-score-list.md")
[[ "$code" == "302" || "$code" == "307" || "$code" == "401" ]] && pass "llms.mdx curl -> ${code} (UA exempt, SSO gate)" || fail "llms.mdx unexpected: ${code}"

echo ""
echo "生产门禁验收完成: $BASE"
