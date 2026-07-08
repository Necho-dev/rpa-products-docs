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
import { normalizeModuleIcon } from '@/lib/docs/source/module-icon-config';
import { shouldInjectModuleGridTocHeadings } from '@/lib/docs/source/module-grid-toc';
import { parseMetaPanelPlatformUrl } from '@/lib/docs/source/module-grid-fs-scan';
import { resolveModuleCoverUrl } from '@/lib/docs/source/resolve-module-cover-url';
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
  moduleTitle?: string;
  moduleGroup?: string;
  moduleIcon?: unknown;
  moduleUrl?: string;
  badge?: { label: string; color?: string };
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
};

function isIndexPage(slugs: string[]): boolean {
  const base = slugBasename(slugs);
  return base === 'index' || slugs.length === 0;
}

async function collectModuleGridSiblingInputs(
  pageSlug: string[],
  access: DocAccessContext,
  gridCover: boolean,
): Promise<{ siblingInputs: SiblingModuleInput[]; packageEntry: string }> {
  const indexPage = source.getPage(pageSlug);
  const packageEntry =
    (indexPage?.data as PageExtras | undefined)?.entry?.trim() ||
    slugBasename(pageSlug);

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

    if (!entry) {
      console.warn(
        `[ModuleGrid] skip "${prefix}/${slug}": missing frontmatter entry`,
      );
      continue;
    }

    let moduleUrl = data.moduleUrl?.trim();
    if (!moduleUrl) {
      try {
        const raw = await page.data.getText('raw');
        moduleUrl = parseMetaPanelPlatformUrl(raw);
      } catch {
        // ignore read errors
      }
    }

    siblingInputs.push({
      slug,
      title: data.title?.trim() || slug,
      description: data.description?.trim(),
      entry,
      moduleTitle: data.moduleTitle,
      moduleGroup: data.moduleGroup,
      moduleIcon: normalizeModuleIcon(data.moduleIcon),
      moduleUrl,
      badge: data.badge,
      dataReady: data.dataReady,
      estimatedDuration: data.estimatedDuration,
      minInterval: data.minInterval,
      coverUrl: resolveModuleCoverUrl(page.slugs, {
        gridCover,
        moduleCover: (page.data as PageExtras & { moduleCover?: boolean }).moduleCover,
      }),
      groupExplicit: Boolean(data.moduleGroup?.trim()),
    });
  }

  siblingInputs.sort((a, b) => a.slug.localeCompare(b.slug));

  return { siblingInputs, packageEntry };
}

export async function collectModuleGridGroups(
  pageSlug: string[],
  groups: Record<string, ModuleGroupConfig | string>,
  access: DocAccessContext,
  gridCover = false,
): Promise<ModuleGroupData[]> {
  const { siblingInputs, packageEntry } = await collectModuleGridSiblingInputs(
    pageSlug,
    access,
    gridCover,
  );
  return collectSiblingModuleGroups(siblingInputs, groups, packageEntry);
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
