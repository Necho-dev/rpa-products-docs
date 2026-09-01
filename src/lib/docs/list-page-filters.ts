import { docsRoute } from '@/lib/core/shared';

function normalizeListPath(path: string): string {
  let p = path.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) {
    p = new URL(p).pathname;
  }
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/** Whether a docs page URL matches list_docs tag / prefix filters. */
export function matchesListPageFilters(
  pageUrl: string,
  filters: { tag?: string | null; prefix?: string | null },
): boolean {
  const url = normalizeListPath(pageUrl);
  const tag = filters.tag?.trim();
  if (tag) {
    const slug =
      url === docsRoute
        ? null
        : url.startsWith(`${docsRoute}/`)
          ? url.slice(docsRoute.length + 1).split('/')[0] ?? null
          : null;
    if (slug !== tag) return false;
  }
  const prefixRaw = filters.prefix?.trim();
  if (prefixRaw) {
    const prefix = normalizeListPath(prefixRaw);
    if (url !== prefix && !url.startsWith(`${prefix}/`)) return false;
  }
  return true;
}
