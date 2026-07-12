import 'server-only';

import type { TOCItemType } from 'fumadocs-core/toc';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  collectSiblingModuleGroups,
  slugBasename,
  type ModuleGroupData,
  type SiblingModuleInput,
} from '@/lib/docs/source/collect-sibling-modules';
import {
  parseModuleGridBlockFromRaw,
  type ModuleGroupConfig,
} from '@/lib/docs/source/module-group-config';
import { readModuleFrontmatter } from '@/lib/docs/source/module-frontmatter';
import { shouldInjectModuleGridTocHeadings } from '@/lib/docs/source/module-grid-toc';
import { resolveModuleCoverUrl } from '@/lib/docs/source/resolve-module-cover-url';
import { compareBySlugOrder, readDocsMetaPagesOrder } from '@/lib/docs/source/meta-pages-order';
import type {
  DataReadyMeta,
  EstimatedDurationMeta,
  MinIntervalMeta,
} from '@/lib/docs/format-schedule-meta';
import { source } from '@/lib/docs/source/source';

type PageExtras = {
  title?: string;
  description?: string;
  entry?: string;
  /** 侧栏图标 CODE / Lucide; 若未配置 `module.icon` 则回退为卡片图标 */
  icon?: string;
  module?: unknown;
  badge?: { label: string; color?: string };
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
};

function isIndexPage(slugs: string[]): boolean {
  const base = slugBasename(slugs);
  return base === 'index' || slugs.length === 0;
}

/**
 * ModuleGrid 卡片字段一律来自子页 frontmatter，不读 :::meta-panel。
 * - title / description / entry
 * - module.title / link / group / icon / cover
 */
async function collectModuleGridSiblingInputs(
  pageSlug: string[],
  access: DocAccessContext,
  gridCover: boolean,
  pagesOrder: readonly string[],
): Promise<SiblingModuleInput[]> {
  const siblingInputs: SiblingModuleInput[] = [];
  const prefix = pageSlug.join('/');

  for (const page of source.getPages()) {
    const slugs = page.slugs;
    if (slugs.length !== pageSlug.length + 1) continue;
    if (!slugs.slice(0, pageSlug.length).every((s, i) => s === pageSlug[i])) continue;
    if (isIndexPage(slugs)) continue;
    if (!isDocPageAccessible(page, access)) continue;

    const data = page.data as PageExtras;
    const slug = slugBasename(slugs);
    const entry = data.entry?.trim();
    const moduleCfg = readModuleFrontmatter(data as Record<string, unknown>);
    const group = moduleCfg.group;

    // 与 collectSiblingModuleGroups 对齐：module.group / slug 即可入格，entry 可选
    if (!group && !slug) {
      console.warn(
        `[ModuleGrid] skip "${prefix}/${slug || '(empty)'}": missing module.group and slug`,
      );
      continue;
    }

    const pageIcon = data.icon?.trim();
    const icon =
      moduleCfg.icon ?? (pageIcon ? { comp: pageIcon } : undefined);

    siblingInputs.push({
      slug,
      title: data.title?.trim() || slug,
      description: data.description?.trim(),
      entry,
      cardTitle: moduleCfg.title,
      group,
      icon,
      link: moduleCfg.link,
      badge: data.badge,
      dataReady: data.dataReady,
      estimatedDuration: data.estimatedDuration,
      minInterval: data.minInterval,
      coverUrl: resolveModuleCoverUrl(page.slugs, {
        gridCover,
        cover: moduleCfg.cover,
      }),
      groupExplicit: Boolean(group),
    });
  }

  siblingInputs.sort((a, b) => compareBySlugOrder(a.slug, b.slug, pagesOrder));

  return siblingInputs;
}

export async function collectModuleGridGroups(
  pageSlug: string[],
  groups: Record<string, ModuleGroupConfig | string>,
  access: DocAccessContext,
  gridCover = false,
): Promise<ModuleGroupData[]> {
  // 同目录 meta.json `pages` 顺序
  const pagesOrder = readDocsMetaPagesOrder(pageSlug.join('/'));
  const siblingInputs = await collectModuleGridSiblingInputs(
    pageSlug,
    access,
    gridCover,
    pagesOrder,
  );
  return collectSiblingModuleGroups(siblingInputs, groups, pagesOrder);
}

/**
 * stack 布局的分组标题由 React 渲染，不在 markdown AST 中；
 * 运行时从 raw 解析 module-grid 并补全 TOC，锚点与 ModuleGridStack 的 id={group.key} 一致。
 */
export async function resolveModuleGridStackToc(
  pageSlug: string[],
  access: DocAccessContext,
): Promise<TOCItemType[]> {
  const page = source.getPage(pageSlug);
  if (!page) return [];

  let raw: string;
  try {
    raw = await page.data.getText('raw');
  } catch {
    return [];
  }

  const parsed = parseModuleGridBlockFromRaw(raw, page.path);
  if (!parsed || parsed.layout !== 'stack') return [];

  const grouped = await collectModuleGridGroups(pageSlug, parsed.groups, access, parsed.cover);
  const nonEmpty = grouped.filter((g) => g.modules.length > 0);
  if (!shouldInjectModuleGridTocHeadings(nonEmpty)) return [];

  return nonEmpty.map((group) => ({
    title: group.label,
    url: `#${group.key}`,
    depth: 3,
  }));
}
