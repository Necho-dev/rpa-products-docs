import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { compareBySlugOrder } from '@/lib/docs/source/compare-slug-order';
import { resolveDocsContentPath } from '@/lib/docs/source/docs-content-path';

export { compareBySlugOrder };

/**
 * 将 meta.json `pages` 项规范为 slug。
 * - `./RPA_QIANNIU` / `RPA_QIANNIU` → `RPA_QIANNIU`
 * - `index` / `...` / `---` / 空 → 忽略
 */
export function normalizeMetaPageEntry(entry: string): string | undefined {
  const t = entry.trim();
  if (!t || t === '...' || t === '---') return undefined;
  const cleaned = t.replace(/^\.\//, '').replace(/\/$/, '');
  if (!cleaned || cleaned === 'index') return undefined;
  // 目录式 `./foo/bar` 取末段，与同目录子页 basename 对齐
  const base = cleaned.includes('/')
    ? cleaned.slice(cleaned.lastIndexOf('/') + 1)
    : cleaned;
  return base || undefined;
}

/** 从 meta.json `pages` 数组解析侧栏顺序（仅保留可入格的 slug） */
export function parseMetaPagesOrder(pages: unknown): string[] {
  if (!Array.isArray(pages)) return [];
  const order: string[] = [];
  const seen = new Set<string>();
  for (const item of pages) {
    if (typeof item !== 'string') continue;
    const slug = normalizeMetaPageEntry(item);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    order.push(slug);
  }
  return order;
}

/**
 * 读取 `content/docs/{docsRelativeDir}/meta.json`。
 * 文件不存在或解析失败时返回 null。
 */
export function readDocsMetaJson(
  docsRelativeDir: string,
): Record<string, unknown> | null {
  const rel = docsRelativeDir.replace(/^\/+|\/+$/g, '');
  const metaPath = resolveDocsContentPath(rel, 'meta.json');
  if (!metaPath) return null;
  try {
    const raw = readFileSync(metaPath, 'utf8');
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 读取 `content/docs/{docsRelativeDir}/meta.json` 的 pages 顺序。
 * 文件不存在或解析失败时返回 []。
 */
export function readDocsMetaPagesOrder(docsRelativeDir: string): string[] {
  return parseMetaPagesOrder(readDocsMetaJson(docsRelativeDir)?.pages);
}

const INDEX_FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/** 读取 `content/docs/{dir}/index.md(x)` 的 YAML frontmatter；没有则 null */
export function readDocsIndexFrontmatter(
  docsRelativeDir: string,
): Record<string, unknown> | null {
  const rel = docsRelativeDir.replace(/^\/+|\/+$/g, '');
  if (!rel) return null;
  for (const name of ['index.md', 'index.mdx'] as const) {
    const filePath = resolveDocsContentPath(rel, name);
    if (!filePath) continue;
    try {
      const raw = readFileSync(filePath, 'utf8');
      const match = INDEX_FRONTMATTER_RE.exec(raw);
      if (!match?.[1]) continue;
      const data = parseYaml(match[1]) as unknown;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 按侧栏目录树比较页面 slugs：每一层用该层 meta.json `pages`，没有则字典序。
 */
export function compareDocsSidebarOrder(
  a: readonly string[],
  b: readonly string[],
  rootPrefix: readonly string[] = [],
): number {
  const start = rootPrefix.length;
  const max = Math.max(a.length, b.length);
  for (let i = start; i < max; i++) {
    const sa = a[i];
    const sb = b[i];
    if (sa == null) return -1;
    if (sb == null) return 1;
    if (sa === sb) continue;
    const parentDir = a.slice(0, i).join('/');
    const cmp = compareBySlugOrder(sa, sb, readDocsMetaPagesOrder(parentDir));
    if (cmp !== 0) return cmp;
  }
  return 0;
}
