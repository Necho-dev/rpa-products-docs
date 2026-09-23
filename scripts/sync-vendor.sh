#!/usr/bin/env bash
# 按 .vendor/mounts 稀疏检出 .vendor/ 下的子模块，并把稀疏目录挂到目标路径。
# 正文不复制进主仓库。清单里的保留文件留在主仓库。
# 任一子模块是新克隆时，向 stdout 打印一行 initialized；说明走 stderr。
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

MANIFEST=".vendor/mounts"

# target、base 都是绝对路径。结果相对 base。
relpath() {
  local target="$1" base="$2" common back
  common="$base"
  back=""
  while [ "${target#"$common"/}" = "$target" ]; do
    if [ "$common" = "/" ]; then
      printf '%s\n' "$target"
      return
    fi
    common="$(dirname "$common")"
    back="../${back}"
  done
  printf '%s%s\n' "$back" "${target#"$common"/}"
}

# 从挂载目录回到仓库根的 ../ 前缀
ups_from() {
  local dest="$1" ups=""
  while [ "$dest" != "." ] && [ -n "$dest" ]; do
    ups="../$ups"
    dest="$(dirname "$dest")"
  done
  printf '%s' "$ups"
}

reject_dotdot() {
  case "$1" in
    *..*) echo "路径不能包含 ..: $1" >&2; exit 1 ;;
  esac
}

# 逐行回调：fn 子模块 稀疏路径 挂载目录 保留文件
each_mount() {
  local fn="$1" line sub sparse dest keep
  [ -f "$MANIFEST" ] || { echo "缺少 $MANIFEST" >&2; exit 1; }
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    IFS='|' read -r sub sparse dest keep <<< "$line"
    [ -n "$sub" ] && [ -n "$sparse" ] && [ -n "$dest" ] || {
      echo "清单行需要 子模块|稀疏路径|挂载目录|保留文件: $line" >&2
      exit 1
    }
    case "$sub" in
      .vendor/*) ;;
      *) echo "路径过滤的子模块必须位于 .vendor/ 下: $sub" >&2; exit 1 ;;
    esac
    reject_dotdot "$sub"
    reject_dotdot "$sparse"
    reject_dotdot "$dest"
    "$fn" "$sub" "$sparse" "$dest" "$keep"
  done < "$MANIFEST"
}

seen_sub=" "
initialized=0

ensure_submodule() {
  local sub="$1" url branch git_dir rel
  case "$seen_sub" in
    *" $sub "*) return ;;
  esac
  seen_sub="$seen_sub$sub "

  url="$(git config -f .gitmodules --get "submodule.$sub.url" || true)"
  branch="$(git config -f .gitmodules --get "submodule.$sub.branch" || true)"
  branch="${branch:-master}"
  if [ -z "$url" ]; then
    echo "缺少 .gitmodules 中的 $sub" >&2
    exit 1
  fi

  git_dir="$(git rev-parse --absolute-git-dir)/modules/$sub"
  if [ ! -e "$sub/.git" ]; then
    echo ">>> 稀疏克隆 $sub ($branch)" >&2
    if [ -e "$git_dir" ]; then
      rm -rf "$git_dir"
    fi
    mkdir -p "$(dirname "$git_dir")" "$(dirname "$sub")"
    git clone --depth 1 --filter=blob:none --sparse --branch "$branch" \
      --separate-git-dir "$git_dir" \
      "$url" "$sub"
    rel="$(relpath "$git_dir" "$ROOT/$sub")"
    printf 'gitdir: %s\n' "$rel" > "$sub/.git"
    git -C "$sub" config --unset core.worktree || true
    initialized=1
  fi

  if git ls-files --stage -- "$sub" | grep -q '^160000'; then
    git submodule init -- "$sub"
  else
    git config "submodule.$sub.url" "$url"
    git config --bool "submodule.$sub.active" true
  fi
}

seen_sparse=" "

apply_sparse_once() {
  local sub="$1" line line_sub sparse
  local paths=()
  case "$seen_sparse" in
    *" $sub "*) return ;;
  esac
  seen_sparse="$seen_sparse$sub "

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    IFS='|' read -r line_sub sparse _dest _keep <<< "$line"
    [ "$line_sub" = "$sub" ] || continue
    paths+=("$sparse")
  done < "$MANIFEST"
  git -C "$sub" sparse-checkout set --cone "${paths[@]}"
}

mount_one() {
  local sub="$1" sparse="$2" dest="$3" keep="$4"
  local src name ups linked=0 k
  local -a find_args=() keeps=()
  src="$sub/$sparse"
  if [ ! -d "$src" ]; then
    echo "稀疏检出后找不到 $src" >&2
    exit 1
  fi

  mkdir -p "$dest"
  IFS=',' read -ra keeps <<< "$keep"
  find_args=(find "$dest" -mindepth 1 -maxdepth 1)
  for k in "${keeps[@]}"; do
    [ -n "$k" ] || continue
    find_args+=(! -name "$k")
  done
  find_args+=(-exec rm -rf {} +)
  "${find_args[@]}"

  ups="$(ups_from "$dest")"
  for entry in "$src"/*; do
    [ -e "$entry" ] || continue
    name="$(basename "$entry")"
    for k in "${keeps[@]}"; do
      [ "$k" = "$name" ] && continue 2
    done
    ln -s "$ups$sub/$sparse/$name" "$dest/$name"
    linked=1
  done
  if [ "$linked" -eq 0 ]; then
    echo "稀疏目录里没有可挂载的条目: $src" >&2
    exit 1
  fi
}

each_mount ensure_submodule
each_mount apply_sparse_once
each_mount mount_one

if [ "$initialized" -eq 1 ]; then
  echo initialized
fi
