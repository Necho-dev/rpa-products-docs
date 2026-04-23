import { isValidElement, type ReactNode } from 'react';

function normalizeClassName(className: unknown): string | undefined {
  if (className == null) return undefined;
  if (typeof className === 'string') return className;
  if (Array.isArray(className)) return className.filter(Boolean).join(' ');
  return String(className);
}

/** 从 rehype / hast 的 `class="language-xxx"` 取出语言 id */
export function getLanguageIdFromClassName(className?: string | unknown): string | undefined {
  const s = normalizeClassName(className);
  if (!s) return undefined;
  const token = s.split(/\s+/).find((c) => c.startsWith('language-'));
  if (!token) return undefined;
  const id = token.slice('language-'.length);
  return id.length > 0 ? id : undefined;
}

/** 深度遍历 MDX/React 子树（pre 下常有空白文本节点 + code，或再包一层） */
function findLanguageIdInReactTree(node: ReactNode): string | undefined {
  if (node == null || typeof node === 'boolean' || typeof node === 'number') return undefined;
  if (typeof node === 'string') return undefined;

  if (Array.isArray(node)) {
    for (const c of node) {
      const hit = findLanguageIdInReactTree(c);
      if (hit) return hit;
    }
    return undefined;
  }

  if (!isValidElement(node)) return undefined;

  const props = node.props as { className?: unknown; children?: ReactNode };
  const fromClass = getLanguageIdFromClassName(props.className);
  if (fromClass) return fromClass;

  return findLanguageIdInReactTree(props.children);
}

/**
 * Shiki / rehype 常把 `language-*` 挂在内部 `code` 上；`pre` 也可能有多个子节点（空白 + code）
 */
export function getLanguageIdFromPreProps(className: string | undefined, children: ReactNode): string | undefined {
  const fromPre = getLanguageIdFromClassName(className);
  if (fromPre) return fromPre;
  return findLanguageIdInReactTree(children);
}

/** 代码块右上角语言角标（短、可读） */
export function getLanguageLabel(langId: string | undefined): string {
  if (!langId) return 'CODE';
  const k = langId.toLowerCase();
  const map: Record<string, string> = {
    ts: 'TS',
    tsx: 'TSX',
    js: 'JS',
    jsx: 'JSX',
    mdx: 'MDX',
    javascript: 'JS',
    typescript: 'TS',
    bash: 'BASH',
    sh: 'SH',
    shell: 'SH',
    shellscript: 'SH',
    zsh: 'SH',
    powershell: 'PS1',
    ps1: 'PS1',
    pwsh: 'PS1',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    css: 'CSS',
    html: 'HTML',
    py: 'PY',
    python: 'PY',
    text: 'TEXT',
    plaintext: 'TEXT',
    md: 'MD',
    markdown: 'MD',
    xml: 'XML',
    toml: 'TOML',
    rs: 'RS',
    rust: 'RS',
    go: 'GO',
    java: 'JAVA',
    kt: 'KT',
    sql: 'SQL',
    env: 'ENV',
    dockerfile: 'DOCKER',
    diff: 'DIFF',
    http: 'HTTP',
  };
  const raw = k.replace(/[^a-z0-9+#.]/gi, '').slice(0, 12).toUpperCase();
  return map[k] ?? (raw.length > 0 ? raw : 'CODE');
}
