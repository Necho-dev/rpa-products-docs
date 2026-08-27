import { compareBySlugOrder } from '@/lib/docs/source/compare-slug-order';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';
import type {
  CategoryFilterFacet,
  CategoryFilterItem,
} from '@/lib/docs/source/category-filter-types';

/** 按 folderPath[depth] 聚芯片 */
export function buildAxisFacet(
  items: readonly CategoryFilterItem[],
  depth: number,
  optionOrder: readonly string[] = [],
  opts?: { branchingOnly?: boolean },
): CategoryFilterFacet | null {
  const withPath = items.filter((it) => {
    if (!it.folderPath[depth]) return false;
    if (opts?.branchingOnly && !it.folderPath[depth + 1]) return false;
    return true;
  });
  if (withPath.length === 0) return null;

  const axisTitle = withPath[0]!.folderPath[depth]!.axisTitle;
  const counts = new Map<
    string,
    { slug: string; item: string; icon?: ModuleIconConfig; count: number }
  >();
  for (const it of withPath) {
    const seg = it.folderPath[depth]!;
    const prev = counts.get(seg.slug);
    if (prev) {
      prev.count += 1;
      continue;
    }
    counts.set(seg.slug, {
      slug: seg.slug,
      item: seg.item,
      icon: seg.icon,
      count: 1,
    });
  }

  const options = [...counts.values()].sort((a, b) =>
    compareBySlugOrder(a.slug, b.slug, optionOrder),
  );

  return { axisTitle, options };
}

export function buildFirstAxisFacet(
  items: readonly CategoryFilterItem[],
  optionOrder: readonly string[] = [],
): CategoryFilterFacet | null {
  return buildAxisFacet(items, 0, optionOrder);
}

export type FacetRowPlan = {
  index: number;
  facet: CategoryFilterFacet | null;
  allCount: number;
  axisTitle: string;
};

/**
 * 概览「平台」展示全部平台（含千牛等叶子）。
 * 「子平台」若与卡片一一对应则不单独占一行。
 */
export function planFacetRows({
  items,
  facet,
  childOrders,
  selected,
  maxDepth,
}: {
  items: readonly CategoryFilterItem[];
  facet: CategoryFilterFacet | null;
  childOrders: Record<string, string[]>;
  selected: readonly (string | null)[];
  maxDepth: number;
}): FacetRowPlan[] {
  const cap = Number.isFinite(maxDepth) ? maxDepth : 8;
  const axisCount = Math.min(
    cap,
    items.reduce((max, it) => Math.max(max, it.folderPath.length), 0),
  );
  const firstAxisSlugs = facet?.options.map((opt) => opt.slug) ?? [];
  const rows: FacetRowPlan[] = [];
  let pool: readonly CategoryFilterItem[] = items;
  for (let i = 0; i < axisCount; i++) {
    const parentSlug = i > 0 ? selected[i - 1] : null;
    const order =
      i === 0
        ? []
        : parentSlug
          ? (childOrders[parentSlug] ?? [])
          : (childOrders[''] ?? uniqueFlatOrders(childOrders, firstAxisSlugs));
    const axisTitleHint =
      items.find((it) => it.folderPath[i])?.folderPath[i]?.axisTitle ?? '';
    let nextFacet =
      i === 0 ? facet : buildAxisFacet(pool, i, order);
    // 概览「子平台」与卡片 1:1 时不占行；平台页「业务场景」即使每场景 1 条也要两级类目。
    if (i > 0 && axisTitleHint !== '平台' && axisTitleHint !== '业务场景') {
      nextFacet = groupingFacet(nextFacet);
    }
    if (i === 0 || nextFacet) {
      rows.push({
        index: i,
        facet: nextFacet,
        allCount: pool.length,
        axisTitle: nextFacet?.axisTitle ?? axisTitleHint,
      });
    }
    if (selected[i]) {
      pool = pool.filter((it) => it.folderPath[i]?.slug === selected[i]);
    }
  }
  return rows;
}

/** 去掉「一芯片一张卡」的轴；芯片 count 全是 1 时返回 null */
export function groupingFacet(
  facet: CategoryFilterFacet | null,
): CategoryFilterFacet | null {
  if (!facet) return null;
  const options = facet.options.filter((opt) => opt.count > 1);
  if (options.length === 0) return null;
  return { ...facet, options };
}

function uniqueFlatOrders(
  childOrders: Record<string, string[]>,
  parentOrder: readonly string[] = [],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const parents = [
    ...parentOrder.filter((key) => key && childOrders[key]),
    ...Object.keys(childOrders).filter(
      (key) => key && key !== '' && !parentOrder.includes(key),
    ),
  ];
  for (const parent of parents) {
    for (const slug of childOrders[parent] ?? []) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}
