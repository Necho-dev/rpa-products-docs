import type { TOCItemType } from 'fumadocs-core/toc';

/** 旧锚点兼容；目录不再出现「附录」。 */
export const DOC_APPENDIX_ID = 'doc-appendix';
export const DOC_CITED_BY_ID = 'doc-cited-by';
export const DOC_ANNOTATIONS_ID = 'doc-annotations';

export type AppendixTab = 'notes' | 'cited';

/**
 * 页底元信息接到 markdown TOC 末尾。
 * 无「附录」父级；与正文 h2 同级。指标注释优先于本文被引用。
 */
export function appendixTocItems(opts: {
  citedBy: number;
  annotations: number;
}): TOCItemType[] {
  const items: TOCItemType[] = [];
  if (opts.annotations > 0) {
    items.push({
      title: `指标注释(${opts.annotations})`,
      url: `#${DOC_ANNOTATIONS_ID}`,
      depth: 2,
    });
  }
  if (opts.citedBy > 0) {
    items.push({
      title: `本文被引用(${opts.citedBy})`,
      url: `#${DOC_CITED_BY_ID}`,
      depth: 2,
    });
  }
  return items;
}

/** 剥离 peek/preview 前缀后的标题 id。 */
export function bareAppendixHeadingId(raw: string): string {
  const id = raw.replace(/^#/, '');
  if (id.startsWith('peek--')) return id.slice('peek--'.length);
  const scoped = id.match(/^ref-.+--(.+)$/u);
  return scoped?.[1] ?? id;
}

export function appendixTabFromHeadingId(
  raw: string,
  opts: { hasCited: boolean; hasNotes: boolean },
): AppendixTab | null {
  const id = bareAppendixHeadingId(raw);
  if (id === DOC_ANNOTATIONS_ID && opts.hasNotes) return 'notes';
  if (id === DOC_CITED_BY_ID && opts.hasCited) return 'cited';
  if (id === DOC_APPENDIX_ID) return opts.hasNotes ? 'notes' : 'cited';
  return null;
}
