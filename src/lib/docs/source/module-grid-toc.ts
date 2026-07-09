/*
 * ModuleGrid TOC 策略（tabs vs stack）：
 * - tabs：remark 注入带 [toc] 的虚拟 heading，React 用 sectionAnchorId 联动 hash。
 * - stack：分组 H3 由 React 渲染，不在 markdown AST；运行时 resolveModuleGridStackToc 补全 TOC。
 */
import GithubSlugger from 'github-slugger';
import type { Heading, PhrasingContent, RootContent } from 'mdast';
import type { ModuleGroupData } from './collect-sibling-modules';

export function buildModuleGridGroupAnchorId(
  sectionId: string,
  groupKey: string,
): string {
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
 * 解析 module-grid 上方最近标题。
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
  group: Pick<ModuleGroupData, 'key' | 'label'>,
  parentDepth: number,
): RootContent {
  const anchorId = buildModuleGridGroupAnchorId(sectionId, group.key);
  const depth = Math.min(6, parentDepth + 1) as Heading['depth'];

  return {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: `${group.label} [toc]` }],
    data: { hProperties: { id: anchorId } },
  };
}

export function shouldInjectModuleGridTocHeadings(
  nonEmptyGroups: ModuleGroupData[],
): boolean {
  return nonEmptyGroups.length > 1;
}

export type ModuleGridGroupAnchor = {
  key: string;
  label: string;
  anchorId: string;
};

export function buildModuleGridGroupAnchors(
  sectionAnchorId: string,
  groups: ModuleGroupData[],
): ModuleGridGroupAnchor[] {
  return groups
    .filter((g) => g.modules.length > 0)
    .map((g) => ({
      key: g.key,
      label: g.label,
      anchorId: buildModuleGridGroupAnchorId(sectionAnchorId, g.key),
    }));
}

export function groupKeyFromLocationHash(
  hash: string,
  groupAnchors: ModuleGridGroupAnchor[],
): string | null {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return null;

  return groupAnchors.find((a) => a.anchorId === id)?.key ?? null;
}
