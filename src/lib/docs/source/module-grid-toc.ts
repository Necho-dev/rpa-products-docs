/*
 * ModuleGrid TOC 策略（tabs vs stack）：
 * - tabs：remark 注入带 [toc] 的虚拟 heading，React 用 sectionAnchorId 联动 hash。
 * - stack：分组 H3 由 React 渲染，不在 markdown AST；运行时 resolveModuleGridStackToc 补全 TOC。
 */
import type { Heading, RootContent } from 'mdast';
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
  data?: { hProperties?: { id?: string } };
};

export function findPrecedingHeading(
  siblings: RootContent[],
  beforeIndex: number,
): PrecedingHeadingInfo | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const node = siblings[i];
    if (node?.type !== 'heading') continue;

    const heading = node as HeadingNode;
    const id = heading.data?.hProperties?.id;
    if (!id) return null;

    return { depth: heading.depth, id };
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
