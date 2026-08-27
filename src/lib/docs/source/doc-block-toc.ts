import GithubSlugger from 'github-slugger';
import type { Heading, PhrasingContent, RootContent } from 'mdast';

export function buildGroupAnchorId(sectionId: string, groupKey: string): string {
  return `${sectionId}-${groupKey}`;
}

export type PrecedingHeadingInfo = {
  depth: number;
  id: string;
};

type HeadingNode = RootContent & {
  depth: number;
  children?: PhrasingContent[];
  data?: { hProperties?: { id?: string } };
};

/** 从 mdast phrasing 节点提取纯文本（与 fumadocs remark-heading 一致） */
export function extractMdastText(nodes: PhrasingContent[] | undefined): string {
  if (!nodes?.length) return '';
  let text = '';
  for (const node of nodes) {
    if (node.type === 'text' || node.type === 'inlineCode') {
      text += node.value;
      continue;
    }
    if ('children' in node && Array.isArray(node.children)) {
      text += extractMdastText(node.children as PhrasingContent[]);
    }
  }
  return text;
}

/**
 * 解析指令块上方最近标题。
 * remark 阶段 heading 通常尚无 hProperties.id（slug 由后续 remark-heading 生成），
 * 此时用标题文本经 github-slugger 推导，与 TOC 锚点保持一致。
 */
export function findPrecedingHeading(
  siblings: RootContent[],
  beforeIndex: number,
): PrecedingHeadingInfo | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const node = siblings[i];
    if (node?.type !== 'heading') continue;

    const heading = node as HeadingNode;
    const existingId = heading.data?.hProperties?.id?.trim();
    if (existingId) {
      return { depth: heading.depth, id: existingId };
    }

    const text = extractMdastText(heading.children).trim();
    if (!text) return null;

    const slugger = new GithubSlugger();
    return { depth: heading.depth, id: slugger.slug(text) };
  }

  return null;
}

export function buildTocOnlyGroupHeading(
  sectionId: string,
  group: { key: string; label: string },
  parentDepth: number,
): RootContent {
  const anchorId = buildGroupAnchorId(sectionId, group.key);
  const depth = Math.min(6, parentDepth + 1) as Heading['depth'];

  return {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: `${group.label} [toc]` }],
    data: { hProperties: { id: anchorId } },
  };
}

/** 从源码取出 :::category-filter 上方最近标题的 slug（与 remark-heading 一致） */
export function parsePrecedingCategoryFilterHeadingId(raw: string): string | undefined {
  const idx = raw.search(/:::category-filter\b/);
  if (idx < 0) return undefined;
  const before = raw.slice(0, idx);
  const matches = [...before.matchAll(/^#{2,6}\s+(.+?)\s*$/gm)];
  const text = matches
    .at(-1)?.[1]
    ?.replace(/\s*\[#[^\]]+\]\s*$/u, '')
    .replace(/\s*\[toc\]\s*$/iu, '')
    .trim();
  if (!text) return undefined;
  return new GithubSlugger().slug(text);
}
