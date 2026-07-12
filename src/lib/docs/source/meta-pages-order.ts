import { readFileSync } from 'node:fs';
import path from 'node:path';

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
  // 目录式 `./foo/bar` 取末段，与 ModuleGrid 子页 basename 对齐
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
 * 读取 `content/docs/{docsRelativeDir}/meta.json` 的 pages 顺序。
 * 文件不存在或解析失败时返回 []。
 */
export function readDocsMetaPagesOrder(docsRelativeDir: string): string[] {
  const rel = docsRelativeDir.replace(/^\/+|\/+$/g, '');
  const metaPath = path.join(process.cwd(), 'content', 'docs', rel, 'meta.json');
  try {
    const raw = readFileSync(metaPath, 'utf8');
    const data = JSON.parse(raw) as { pages?: unknown };
    return parseMetaPagesOrder(data.pages);
  } catch {
    return [];
  }
}

/**
 * 按 meta pages 顺序比较两个 slug；未出现在 order 中的排在后面，再按 localeCompare。
 */
export function compareBySlugOrder(
  a: string,
  b: string,
  order: readonly string[],
): number {
  if (order.length === 0) return a.localeCompare(b);
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
