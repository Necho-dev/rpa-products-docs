export type CategoryFilterAnchor = { key: string; anchorId: string };

export type CategoryFilterHashHit =
  | { kind: 'all' }
  | { kind: 'slug'; slug: string }
  | { kind: 'ignore' };

export function hashIdFromLocationHash(hash: string): string {
  const raw = hash.replace(/^#/, '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** TOC / 地址栏 hash → 第一轴筛选。父级标题视为「全部」。 */
export function selectedSlugFromCategoryFilterHash(
  hash: string,
  anchors: readonly CategoryFilterAnchor[],
  sectionAnchorId?: string,
): CategoryFilterHashHit {
  const raw = hashIdFromLocationHash(hash);
  if (!raw) return { kind: 'ignore' };
  if (sectionAnchorId && raw === sectionAnchorId) return { kind: 'all' };
  const hit = anchors.find((a) => a.anchorId === raw);
  if (hit) return { kind: 'slug', slug: hit.key };
  return { kind: 'ignore' };
}
