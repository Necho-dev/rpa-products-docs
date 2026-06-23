/** 过滤与 Tab 分组 label 重复的 tag（如 label「商品/Item」去掉 tag「商品」） */
export function filterCoverTags(
  tags: string[] | undefined,
  groupLabel?: string,
): string[] {
  if (!tags?.length) return [];
  if (!groupLabel?.trim()) return tags.slice(0, 2);

  const labelParts = groupLabel
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  const filtered = tags.filter(
    (tag) => !labelParts.some((part) => part === tag.trim()),
  );

  return (filtered.length > 0 ? filtered : tags).slice(0, 2);
}
