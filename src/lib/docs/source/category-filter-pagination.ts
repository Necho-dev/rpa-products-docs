export const DEFAULT_CATEGORY_FILTER_PAGE_SIZE = 12;

export type PageToken = number | 'ellipsis';

/**
 * 翻页页码：当前页附近窗口 + 首页/末页，中间省略。
 */
export function buildPageTokens(
  current: number,
  totalPages: number,
  siblingCount = 2,
): PageToken[] {
  if (totalPages < 1) return [];
  const page = Math.min(Math.max(1, current), totalPages);
  if (totalPages <= siblingCount * 2 + 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [];
  const start = Math.max(2, page - siblingCount);
  const end = Math.min(totalPages - 1, page + siblingCount);

  tokens.push(1);
  if (start > 2) tokens.push('ellipsis');
  for (let i = start; i <= end; i++) tokens.push(i);
  if (end < totalPages - 1) tokens.push('ellipsis');
  tokens.push(totalPages);
  return tokens;
}

export function pageCount(totalItems: number, size: number): number {
  if (totalItems <= 0 || size < 1) return 0;
  return Math.ceil(totalItems / size);
}
