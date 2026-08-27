import 'server-only';

import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { readCategory, readMetaCategoryAxis } from '@/lib/docs/source/category-config';
import {
  readCategoryFilterDirectiveFromDocsPath,
  readPrecedingCategoryFilterHeadingIdFromDocsPath,
} from '@/lib/docs/source/category-filter-config';
import { collectCategoryFilter } from '@/lib/docs/source/collect-descendant-modules';
import { buildFirstAxisFacet } from '@/lib/docs/source/category-filter-facet';
import type {
  CategoryFilterLayout,
  CategoryFilterPagination,
} from '@/lib/docs/source/category-filter-types';
import {
  readDocsIndexFrontmatter,
  readDocsMetaJson,
  readDocsMetaPagesOrder,
} from '@/lib/docs/source/meta-pages-order';
import { source } from '@/lib/docs/source/source';
import { CategoryFilterPanel } from '@/components/docs/mdx/category-filter-panel';

function firstAxisOrder(pageSlug: string[]): string[] {
  const dir = pageSlug.join('/');
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value?: string) => {
    const slug = value?.trim();
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    out.push(slug);
  };
  // 子平台第一轴 slug 是目录名（YX），不是 index 里的 category.slug（yx）
  for (const folder of readDocsMetaPagesOrder(dir)) {
    push(folder);
    const rel = dir ? `${dir}/${folder}` : folder;
    push(readCategory(readDocsIndexFrontmatter(rel)?.category).slug);
  }
  for (const key of readMetaCategoryAxis(readDocsMetaJson(dir)).items?.map(
    (row) => row.key,
  ) ?? []) {
    push(key);
  }
  return out;
}

function readDirectiveFromPage(pageSlug: string[]) {
  const page = source.getPage(pageSlug);
  if (!page?.path) return null;
  return readCategoryFilterDirectiveFromDocsPath(page.path);
}

export async function CategoryFilter({
  pageSlug,
  cover = false,
  search = true,
  labels = true,
  depth,
  layout,
  hubs = false,
  pagination,
  sectionAnchorId,
}: {
  pageSlug: string[];
  cover?: boolean;
  search?: boolean;
  labels?: boolean;
  depth?: number;
  layout?: CategoryFilterLayout;
  hubs?: boolean;
  pagination?: CategoryFilterPagination;
  sectionAnchorId?: string;
}) {
  const parsed = readDirectiveFromPage(pageSlug);
  const resolvedCover = parsed?.cover ?? cover;
  const resolvedSearch = parsed?.search ?? search;
  const resolvedLabels = parsed?.labels ?? labels;
  const resolvedDepth = parsed?.depth ?? depth;
  const resolvedLayout = parsed?.layout ?? layout;
  const resolvedHubs = parsed?.hubs ?? hubs;
  const resolvedPagination = parsed?.pagination ?? pagination;

  const access = await getDocAccessContextFromRequest();
  const { items, childOrders } = collectCategoryFilter(pageSlug, access, {
    cover: resolvedCover,
    depth: resolvedDepth,
    hubs: resolvedHubs,
  });
  const facet = buildFirstAxisFacet(items, firstAxisOrder(pageSlug));
  const pagePath = source.getPage(pageSlug)?.path;
  const resolvedSectionAnchorId =
    sectionAnchorId ??
    (pagePath
      ? readPrecedingCategoryFilterHeadingIdFromDocsPath(pagePath)
      : undefined);

  return (
    <CategoryFilterPanel
      items={items}
      facet={facet}
      childOrders={childOrders}
      depth={resolvedDepth}
      layout={resolvedLayout}
      search={resolvedSearch}
      labels={resolvedLabels}
      pagination={resolvedPagination}
      sectionAnchorId={resolvedSectionAnchorId}
    />
  );
}
