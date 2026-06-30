#!/usr/bin/env bash
# 宿主机管理 DOCS_SECRETS_FILE_PATH（JSON: { "sh_hex": "plain_secret" }）
# sh = SHA256(App Secret)，与 src/lib/auth/cube.ts / deploy/CUBE_SSO.md 一致
#
# 用法:
#   ./scripts/manage-secrets.sh list [--file PATH]
#   ./scripts/manage-secrets.sh add [secret] [--file PATH]
#   ./scripts/manage-secrets.sh remove <sh_prefix> [--file PATH]
#   ./scripts/manage-secrets.sh show <sh_prefix> [--reveal] [--file PATH]
#
# 路径优先级: --file > 当前目录 .env 的 DOCS_SECRETS_FILE_PATH > /opt/secrets/secrets.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_SECRETS_PATH="/opt/secrets/secrets.json"

YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

err() {
  echo "错误: $*" >&2
  exit 1
}

confirm_yes() {
  local prompt="$1"
  echo -e "${YELLOW}${prompt}${NC}"
  read -r -p '输入 "yes" 确认继续，其他任意输入取消: ' answer
  [[ "$answer" == "yes" ]]
}

sha256_hex() {
  printf '%s' "$1" | openssl dgst -sha256 -hex | awk '{print $2}'
}

resolve_secrets_path_from_args() {
  local explicit=""
  local i=1
  while [[ $i -le $# ]]; do
    local arg="${!i}"
    if [[ "$arg" == "--file" ]]; then
      i=$((i + 1))
      explicit="${!i:-}"
      [[ -n "$explicit" ]] || err "--file 需要路径参数"
      echo "$explicit"
      return
    fi
    i=$((i + 1))
  done

  if [[ -f "$ROOT/.env" ]]; then
    local from_env
    from_env="$(grep -E '^DOCS_SECRETS_FILE_PATH=' "$ROOT/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'' ]*//;s/["'\'' ]*$//' || true)"
    if [[ -n "$from_env" ]]; then
      echo "$from_env"
      return
    fi
  fi

  echo "$DEFAULT_SECRETS_PATH"
}

ensure_parent_dir() {
  local path="$1"
  local dir
  dir="$(dirname "$path")"
  [[ -d "$dir" ]] || mkdir -p "$dir"
}

read_secrets_json() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo '{}'
    return
  fi
  python3 - "$path" <<'PY'
import json, sys
path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    data = {}
if not isinstance(data, dict):
    raise SystemExit("secrets 文件必须是 JSON 对象")
out = {k: v for k, v in data.items() if isinstance(k, str) and isinstance(v, str) and v and not k.startswith("_")}
print(json.dumps(out, ensure_ascii=False))
PY
}

write_secrets_json() {
  local path="$1"
  local json="$2"
  ensure_parent_dir "$path"
  local tmp
  tmp="$(mktemp "$(dirname "$path")/secrets.XXXXXX")"
  printf '%s\n' "$json" >"$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$path"
  chmod 600 "$path"
}

cmd_list() {
  local path="$1"
  python3 - "$path" <<'PY'
import json, sys
path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    data = {}
except json.JSONDecodeError as e:
    raise SystemExit(f"无法解析 {path}: {e}")
if not isinstance(data, dict):
    raise SystemExit("secrets 文件必须是 JSON 对象")
items = [(k, v) for k, v in data.items() if isinstance(k, str) and isinstance(v, str) and v and not k.startswith("_")]
if not items:
    print("(空)")
    sys.exit(0)
print(f"共 {len(items)} 条密钥 ({path}):")
for sh, _ in sorted(items):
    print(f"  {sh[:8]}…  ({len(sh)} hex)")
PY
}

find_sh_by_prefix() {
  local path="$1"
  local prefix="$2"
  python3 - "$path" "$prefix" <<'PY'
import json, sys
path, prefix = sys.argv[1], sys.argv[2]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    data = {}
matches = [k for k in data if isinstance(k, str) and k.startswith(prefix) and isinstance(data.get(k), str)]
if len(matches) == 0:
    raise SystemExit(f"未找到 sh 前缀: {prefix}")
if len(matches) > 1:
    raise SystemExit(f"前缀 {prefix} 匹配多条，请加长前缀:\n" + "\n".join(matches))
print(matches[0])
PY
}

cmd_show() {
  local path="$1"
  local prefix="$2"
  local reveal="$3"
  local sh
  sh="$(find_sh_by_prefix "$path" "$prefix")"
  echo "sh: $sh"
  if [[ "$reveal" != "true" ]]; then
    echo "(secret 明文已隐藏，使用 --reveal 查看)"
    return
  fi
  if ! confirm_yes "WARNING: 即将显示 secret 明文，请确认终端无他人旁观，且不会被截图留存。"; then
    echo "已取消。"
    exit 0
  fi
  python3 - "$path" "$sh" <<'PY'
import json, sys
path, sh = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
secret = data.get(sh, "")
print(f"\033[0;31m[SENSITIVE]\033[0m secret: {secret}")
PY
}

cmd_add() {
  local path="$1"
  local secret="$2"
  if [[ -z "$secret" ]]; then
    read -r -s -p "App Secret（不回显）: " secret
    echo
    [[ -n "$secret" ]] || err "secret 不能为空"
  fi
  local sh
  sh="$(sha256_hex "$secret")"
  local current new_json
  current="$(read_secrets_json "$path")"
  new_json="$(python3 - "$current" "$sh" "$secret" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
sh, secret = sys.argv[2], sys.argv[3]
if sh in data:
    raise SystemExit(f"sh 已存在: {sh[:8]}…")
data[sh] = secret
print(json.dumps(data, ensure_ascii=False, indent=2))
PY
)"
  write_secrets_json "$path" "$new_json"
  echo "已添加 sh ${sh:0:8}… → $path"
  echo "提示: 容器内应用有 secrets 内存缓存，变更后请重启对应 Docker 实例。"
}

cmd_remove() {
  local path="$1"
  local prefix="$2"
  local sh
  sh="$(find_sh_by_prefix "$path" "$prefix")"
  echo "将删除 sh: $sh"
  if ! confirm_yes "WARNING: 删除后嵌入验签将失效，此操作不可撤销。"; then
    echo "已取消。"
    exit 0
  fi
  local current new_json
  current="$(read_secrets_json "$path")"
  new_json="$(python3 - "$current" "$sh" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
sh = sys.argv[2]
if sh not in data:
    raise SystemExit(f"sh 不存在: {sh}")
del data[sh]
print(json.dumps(data, ensure_ascii=False, indent=2))
PY
)"
  write_secrets_json "$path" "$new_json"
  echo "已删除 sh ${sh:0:8}…"
  echo "提示: 请重启对应 Docker 实例使变更生效。"
}

main() {
  [[ $# -ge 1 ]] || usage 1

  local cmd="$1"
  shift

  case "$cmd" in
    -h | --help | help)
      usage 0
      ;;
  esac

  local secrets_path
  secrets_path="$(resolve_secrets_path_from_args "$@")"

  local reveal=false
  local positional=()
  local i=1
  while [[ $i -le $# ]]; do
    local arg="${!i}"
    case "$arg" in
      --reveal) reveal=true ;;
      --file)
        i=$((i + 1))
        ;;
      *)
        positional+=("$arg")
        ;;
    esac
    i=$((i + 1))
  done

  case "$cmd" in
    list)
      cmd_list "$secrets_path"
      ;;
    add)
      local secret="${positional[0]:-}"
      cmd_add "$secrets_path" "$secret"
      ;;
    remove)
      [[ ${#positional[@]} -ge 1 ]] || err "用法: remove <sh_prefix> [--file PATH]"
      cmd_remove "$secrets_path" "${positional[0]}"
      ;;
    show)
      [[ ${#positional[@]} -ge 1 ]] || err "用法: show <sh_prefix> [--reveal] [--file PATH]"
      cmd_show "$secrets_path" "${positional[0]}" "$reveal"
      ;;
    *)
      err "未知子命令: $cmd（可用: list | add | remove | show）"
      ;;
  esac
}

main "$@"
