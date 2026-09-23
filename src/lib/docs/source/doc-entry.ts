/** 未写 entry 时用文件名(去掉扩展名); 目录索引 `index` 不是技术标识, 不回退 */
export function inferDocEntry(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  const base = filePath.split(/[/\\]/).pop() ?? '';
  const stem = base.replace(/\.(md|mdx)$/i, '').trim();
  if (!stem || stem.toLowerCase() === 'index') return undefined;
  return stem;
}
