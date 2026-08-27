import 'server-only';

import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import {
  appendLeafCategorySegment,
  buildFolderPath,
  buildHubFolderPath,
  isHubSlug,
  hasChildHubSlug,
  isDocsFolderIndexPath,
  readCategory,
  readLeafCategoryKey,
  readMetaCategoryAxis,
  slugsStartWith,
  type FolderLookup,
} from '@/lib/docs/source/category-config';
import { compareDocsSidebarOrder, readDocsMetaJson, readDocsIndexFrontmatter, readDocsMetaPagesOrder } from '@/lib/docs/source/meta-pages-order';
import { resolveModuleCoverUrl } from '@/lib/docs/source/resolve-module-cover-url';
import { source } from '@/lib/docs/source/source';
import type {
  DataReadyMeta,
  EstimatedDurationMeta,
  MinIntervalMeta,
} from '@/lib/docs/format-schedule-meta';
import type { TOCItemType } from 'fumadocs-core/toc';
import {
  isWithinCategoryFilterDepth,
  readCategoryFilterDirectiveFromDocsPath,
  readPrecedingCategoryFilterHeadingIdFromDocsPath,
} from '@/lib/docs/source/category-filter-config';
import { buildGroupAnchorId } from '@/lib/docs/source/doc-block-toc';
import { buildFirstAxisFacet } from '@/lib/docs/source/category-filter-facet';
import type {
  CategoryFilterFacet,
  CategoryFilterItem,
} from '@/lib/docs/source/category-filter-types';

export type { CategoryFilterFacet, CategoryFilterItem };
export { buildFirstAxisFacet };

export type CategoryFilterCollectResult = {
  items: CategoryFilterItem[];
  childOrders: Record<string, string[]>;
};

const folderLookupCache = new Map<string, FolderLookup>();

function folderKey(slugs: readonly string[]): string {
  return slugs.join('/');
}

function lookupFolder(slugs: string[]): FolderLookup | undefined {
  const key = folderKey(slugs);
  const cached = folderLookupCache.get(key);
  if (cached) return cached;

  const meta = slugs.length > 0 ? readDocsMetaJson(key) : readDocsMetaJson('');
  const indexFm = slugs.length > 0 ? readDocsIndexFrontmatter(key) : null;
  const page = source.getPage(slugs.length ? slugs : undefined);
  const data = page?.data as
    | {
        title?: string;
        icon?: string;
        category?: unknown;
      }
    | undefined;

  const fromAxis = readMetaCategoryAxis(meta);
  const fromPage = readCategory(data?.category);
  const fromIndex = readCategory(indexFm?.category);
  const lookup: FolderLookup = {
    axis: fromAxis,
    category: {
      slug: fromIndex.slug ?? fromPage.slug,
      item: fromIndex.item ?? fromPage.item,
      icon: fromIndex.icon ?? fromPage.icon,
      link: fromIndex.link ?? fromPage.link,
    },
    title:
      data?.title?.trim() ||
      (typeof indexFm?.title === 'string' ? indexFm.title.trim() : undefined) ||
      (typeof meta?.title === 'string' ? meta.title.trim() : undefined),
    icon:
      data?.icon?.trim() ||
      (typeof indexFm?.icon === 'string' ? indexFm.icon.trim() : undefined),
  };
  folderLookupCache.set(key, lookup);
  return lookup;
}

export function collectCategoryFilterItems(
  pageSlug: string[],
  access: DocAccessContext,
  options: {
    cover?: boolean;
    depth?: number;
    hubs?: boolean;
  } = {},
): CategoryFilterItem[] {
  return collectCategoryFilter(pageSlug, access, options).items;
}

export function collectCategoryFilter(
  pageSlug: string[],
  access: DocAccessContext,
  options: {
    cover?: boolean;
    depth?: number;
    hubs?: boolean;
  } = {},
): CategoryFilterCollectResult {
  const gridCover = options.cover ?? false;
  const collectHubs = options.hubs === true;
  const maxDepth =
    typeof options.depth === 'number' && options.depth >= 1
      ? options.depth
      : Number.POSITIVE_INFINITY;
  folderLookupCache.clear();

  const pages = source.getPages();
  const allSlugs = pages.map((p) => p.slugs);
  const prefixOrder = readDocsMetaPagesOrder(pageSlug.join('/'));
  const items: CategoryFilterItem[] = [];
  const childOrders: Record<string, string[]> = {};

  for (const page of pages) {
    const slugs = page.slugs;
    if (!slugsStartWith(slugs, pageSlug)) continue;
    if (
      !isWithinCategoryFilterDepth(
        slugs,
        pageSlug,
        Number.isFinite(maxDepth) ? maxDepth : undefined,
      )
    ) {
      continue;
    }
    const isHub = isHubSlug(slugs, allSlugs);
    if (collectHubs) {
      if (!isHub) continue;
      if (hasChildHubSlug(slugs, allSlugs)) continue;
    } else if (isHub || isDocsFolderIndexPath(page.path)) {
      continue;
    }
    if (!isDocPageAccessible(page, access)) continue;

    const data = page.data as {
      title?: string;
      description?: string;
      entry?: string;
      icon?: string;
      badge?: { label: string; color?: string };
      category?: unknown;
      dataReady?: DataReadyMeta;
      estimatedDuration?: EstimatedDurationMeta;
      minInterval?: MinIntervalMeta;
    };
    const cat = readCategory(data.category);
    const pageIcon = data.icon?.trim();
    const icon =
      cat.icon ?? (pageIcon ? { comp: pageIcon } : undefined);
    let folderPath = collectHubs
      ? buildHubFolderPath(pageSlug, slugs, lookupFolder)
      : appendLeafCategorySegment(
          buildFolderPath(pageSlug, slugs, lookupFolder),
          lookupFolder(slugs.slice(0, -1)),
          readLeafCategoryKey(data.category),
        );
    if (!collectHubs && Number.isFinite(maxDepth)) {
      folderPath = folderPath.slice(0, maxDepth);
    }
    if (!collectHubs) {
      const parentLookup = lookupFolder(slugs.slice(0, -1));
      const parentFolderSlug = folderPath[0]?.slug;
      const catalogKeys = parentLookup?.axis?.items?.map((row) => row.key);
      if (parentFolderSlug && catalogKeys?.length && !childOrders[parentFolderSlug]) {
        childOrders[parentFolderSlug] = catalogKeys;
      }
    }
    const title = data.title?.trim() || slugs[slugs.length - 1] || page.url;
    const entry = data.entry?.trim();
    let url = cat.link ?? lookupFolder(slugs)?.category?.link;
    if (!url) {
      for (let n = slugs.length - 1; n > pageSlug.length; n--) {
        url = lookupFolder(slugs.slice(0, n))?.category?.link;
        if (url) break;
      }
    }

    items.push({
      href: page.url,
      title,
      description: data.description?.trim(),
      ...(entry ? { entry } : {}),
      ...(data.badge ? { badge: data.badge } : {}),
      ...(icon ? { icon } : {}),
      ...(url ? { url } : {}),
      coverUrl: resolveModuleCoverUrl(slugs, { gridCover }),
      folderPath,
      slugs,
      dataReady: data.dataReady,
      estimatedDuration: data.estimatedDuration,
      minInterval: data.minInterval,
    });
  }

  if (!collectHubs) {
    const parentSlugs = Object.keys(childOrders).filter((key) => key !== '');
    if (parentSlugs.length > 0) {
      const orderedParents: string[] = [];
      for (const slug of prefixOrder) {
        if (parentSlugs.includes(slug)) orderedParents.push(slug);
      }
      for (const slug of parentSlugs) {
        if (!orderedParents.includes(slug)) orderedParents.push(slug);
      }
      const seen = new Set<string>();
      const flat: string[] = [];
      for (const parent of orderedParents) {
        for (const slug of childOrders[parent] ?? []) {
          if (seen.has(slug)) continue;
          seen.add(slug);
          flat.push(slug);
        }
      }
      if (flat.length > 0) childOrders[''] = flat;
    }
  }

  if (collectHubs) {
    const nested = new Map<string, Set<string>>();
    for (const item of items) {
      for (let i = 1; i < item.folderPath.length; i++) {
        const parent = item.folderPath[i - 1]?.slug;
        const child = item.folderPath[i]?.slug;
        if (!parent || !child) continue;
        let set = nested.get(parent);
        if (!set) {
          set = new Set();
          nested.set(parent, set);
        }
        set.add(child);
      }
    }
    const ecoKeys = new Set(
      lookupFolder(pageSlug)?.axis?.items?.map((row) => row.key) ?? [],
    );
    for (const [parent, children] of nested) {
      const preferred = ecoKeys.has(parent)
        ? prefixOrder
        : readDocsMetaPagesOrder(
            pageSlug.length ? `${pageSlug.join('/')}/${parent}` : parent,
          );
      const ordered: string[] = [];
      for (const slug of preferred) {
        if (children.has(slug)) ordered.push(slug);
      }
      for (const slug of children) {
        if (!ordered.includes(slug)) ordered.push(slug);
      }
      childOrders[parent] = ordered;
    }
    const platformSlugs = new Set<string>();
    for (const item of items) {
      const slug = item.folderPath[1]?.slug;
      if (slug) platformSlugs.add(slug);
    }
    if (platformSlugs.size > 0) {
      const rootOrder: string[] = [];
      for (const slug of prefixOrder) {
        if (platformSlugs.has(slug)) rootOrder.push(slug);
      }
      for (const slug of platformSlugs) {
        if (!rootOrder.includes(slug)) rootOrder.push(slug);
      }
      childOrders[''] = rootOrder;
    }
  }

  items.sort((a, b) =>
    compareDocsSidebarOrder(a.slugs ?? [], b.slugs ?? [], pageSlug),
  );

  return { items, childOrders };
}

export async function resolveCategoryFilterStackToc(
  pageSlug: string[],
  access: DocAccessContext,
): Promise<TOCItemType[]> {
  const page = source.getPage(pageSlug);
  if (!page?.path) return [];

  const parsed = readCategoryFilterDirectiveFromDocsPath(page.path);
  if (!parsed || (parsed.layout !== 'stack' && parsed.layout !== 'tabs')) {
    return [];
  }

  const { items } = collectCategoryFilter(pageSlug, access, parsed);
  const catalogKeys =
    readMetaCategoryAxis(readDocsMetaJson(pageSlug.join('/'))).items?.map(
      (row) => row.key,
    ) ?? [];
  const pageOrder = readDocsMetaPagesOrder(pageSlug.join('/'));
  const facet = buildFirstAxisFacet(
    items,
    catalogKeys.length > 0 ? catalogKeys : pageOrder,
  );
  if (!facet || facet.options.length < 1) return [];

  if (parsed.layout === 'stack') {
    return facet.options.map((opt) => ({
      title: opt.item,
      url: `#${opt.slug}`,
      depth: 3,
    }));
  }

  const sectionId = readPrecedingCategoryFilterHeadingIdFromDocsPath(page.path);
  if (!sectionId) return [];
  return facet.options.map((opt) => ({
    title: opt.item,
    url: `#${buildGroupAnchorId(sectionId, opt.slug)}`,
    depth: 3,
  }));
}
