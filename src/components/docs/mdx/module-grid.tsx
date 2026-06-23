import 'server-only';

import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { ModuleGridTabs } from '@/components/docs/mdx/module-grid-tabs';
import { collectModuleGridGroups } from '@/lib/docs/source/module-grid-runtime';
import type { ModuleGridLayout } from '@/lib/docs/source/module-group-config';
import { buildModuleGridGroupAnchors } from '@/lib/docs/source/module-grid-toc';
import type { ModuleGroupConfig } from '@/lib/docs/source/module-group-config';

export async function ModuleGrid({
  pageSlug,
  groups = {},
  layout = 'tabs',
  cover = false,
  sectionAnchorId,
}: {
  pageSlug: string[];
  groups?: Record<string, ModuleGroupConfig | string>;
  layout?: ModuleGridLayout;
  /** 是否在卡片顶栏展示 cover.png（与 layout 同级，在 :::module-grid YAML 中声明） */
  cover?: boolean;
  /** 与 :::module-grid 上方 ## heading 的 anchor id 一致，用于 TOC / hash 联动 */
  sectionAnchorId?: string;
}) {
  const access = await getDocAccessContextFromRequest();
  const grouped = await collectModuleGridGroups(pageSlug, groups, access, cover);
  const groupAnchors = sectionAnchorId
    ? buildModuleGridGroupAnchors(sectionAnchorId, grouped)
    : undefined;

  return (
    <ModuleGridTabs groups={grouped} layout={layout} groupAnchors={groupAnchors} />
  );
}
