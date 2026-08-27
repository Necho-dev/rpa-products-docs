import type { CategoryItemDef } from '@/lib/docs/source/category-config';

/** `false` 关闭；`header` 顶栏第二行；`select` 一级 Tab 下拉 */
export type CategoryNavPlacement = false | 'header' | 'select';

export type CategoryNavModel = {
  placement: Exclude<CategoryNavPlacement, false>;
  title: string;
  /** 无尾斜杠，如 `/docs/rpa` */
  prefix: string;
  items: CategoryItemDef[];
  /** 一级文件夹 index URL → categoryAxis.items[].key */
  keyByUrl: Record<string, string>;
};

export function readCategoryNav(value: unknown): CategoryNavPlacement {
  if (value === false) return false;
  if (value === 'header' || value === 'select') return value;
  if (value === 'sidebar') return 'select';
  return false;
}

export function readMetaCategoryNav(
  meta: Record<string, unknown> | null | undefined,
): CategoryNavPlacement {
  return readCategoryNav(meta?.categoryNav);
}

export function normalizeDocsPath(url: string): string {
  if (url.length > 1 && url.endsWith('/')) return url.slice(0, -1);
  return url;
}

export function matchCategoryNavModel(
  pathname: string,
  models: readonly CategoryNavModel[],
): CategoryNavModel | null {
  const p = normalizeDocsPath(pathname);
  return (
    models.find((m) => p === m.prefix || p.startsWith(`${m.prefix}/`)) ?? null
  );
}

/** 概览页为 null（全部）；否则取路径上最长匹配的一级枢纽 */
export function inferredCategoryNavKey(
  pathname: string,
  model: CategoryNavModel,
): string | null {
  const p = normalizeDocsPath(pathname);
  if (p === model.prefix) return null;
  let best: { len: number; key: string } | undefined;
  for (const [url, key] of Object.entries(model.keyByUrl)) {
    const u = normalizeDocsPath(url);
    if (p === u || p.startsWith(`${u}/`)) {
      if (!best || u.length > best.len) best = { len: u.length, key };
    }
  }
  return best?.key ?? null;
}

export function lookupUrlCategoryKey(
  url: string | undefined,
  keyByUrl: Record<string, string>,
): string | undefined {
  if (!url) return undefined;
  const u = normalizeDocsPath(url);
  return keyByUrl[u] ?? keyByUrl[`${u}/`];
}

export const CATEGORY_NAV_QUERY = 'nav';

export function isCategoryNavKey(
  key: string | null | undefined,
  model: CategoryNavModel,
): key is string {
  return Boolean(key && model.items.some((row) => row.key === key));
}

/** 具体页跟路径；概览页跟 ?nav= */
export function resolveCategoryNavSelection(
  pathname: string,
  navQuery: string | null,
  model: CategoryNavModel,
): string | null {
  const inferred = inferredCategoryNavKey(pathname, model);
  if (inferred != null) return inferred;
  return isCategoryNavKey(navQuery, model) ? navQuery : null;
}

export function categoryNavHref(
  model: CategoryNavModel,
  key: string | null,
): string {
  if (!key) return model.prefix;
  return `${model.prefix}?${CATEGORY_NAV_QUERY}=${encodeURIComponent(key)}`;
}

/**
 * 侧栏一级节点是否显示。搜索过滤进行中时不拦截。
 */
export function sidebarNodePassesCategoryNav(opts: {
  selectedKey: string | null;
  nodeUrl: string | undefined;
  pathname: string;
  keyByUrl: Record<string, string>;
  prefix: string;
  isFiltering?: boolean;
}): boolean {
  if (opts.isFiltering) return true;
  if (opts.selectedKey == null) return true;
  const url = opts.nodeUrl ? normalizeDocsPath(opts.nodeUrl) : '';
  if (!url) return false;
  if (url === normalizeDocsPath(opts.prefix)) return true;
  return lookupUrlCategoryKey(url, opts.keyByUrl) === opts.selectedKey;
}
