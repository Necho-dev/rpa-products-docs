/** 页面 slug 里的中文目录名是 encodeURI 结果, 需在展示和排序时还原 */
export function decodePathSegment(slug: string): string {
  if (!slug.includes('%')) return slug;
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/**
 * 按给定 slug 顺序比较；未出现在 order 中的排在后面，再按 localeCompare。
 * 无 Node API，可给客户端筛选项使用。
 */
export function compareBySlugOrder(
  a: string,
  b: string,
  order: readonly string[],
): number {
  if (order.length === 0) return decodePathSegment(a).localeCompare(decodePathSegment(b));
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 && ib === -1) return decodePathSegment(a).localeCompare(decodePathSegment(b));
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
