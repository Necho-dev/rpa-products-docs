/**
 * 按给定 slug 顺序比较；未出现在 order 中的排在后面，再按 localeCompare。
 * 无 Node API，可给客户端筛选项使用。
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
