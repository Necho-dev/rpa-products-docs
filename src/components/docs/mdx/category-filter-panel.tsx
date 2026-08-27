'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Cards } from 'fumadocs-ui/components/card';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { renderModuleIcon } from '@/lib/docs/icons/client';
import { planFacetRows } from '@/lib/docs/source/category-filter-facet';
import type {
  CategoryFilterFacet,
  CategoryFilterItem,
  CategoryFilterLayout,
  CategoryFilterPagination,
} from '@/lib/docs/source/category-filter-types';
import { CategoryFilterTable } from '@/components/docs/mdx/category-filter-table';
import { ModuleCard } from '@/components/docs/mdx/module-card';
import { CategoryFilterPager, useCategoryFilterWindow } from '@/components/docs/mdx/category-filter-pager';
import {
  DEFAULT_CATEGORY_FILTER_PAGE_SIZE,
  pageCount,
} from '@/lib/docs/source/category-filter-pagination';
import { selectedSlugFromCategoryFilterHash } from '@/lib/docs/source/category-filter-hash';
import {
  DOCS_HASH_EVENT,
  notifyDocsHashChange,
} from '@/lib/docs/smooth-scroll-to-anchor';

const MODULE_CARDS_GRID_CLASS =
  '![grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4 md:gap-5';

/** 芯片单行高度（含 py-1.5 + 图标 + 边框），收起时只露出这一行 */
const CHIP_ROW_MAX_CLASS = 'max-h-9';

function usesFacetRows(layout?: CategoryFilterLayout): boolean {
  return layout == null || layout === 'tabs' || layout === 'table';
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function itemMatches(
  item: CategoryFilterItem,
  query: string,
  selected: readonly (string | null)[],
): boolean {
  for (let i = 0; i < selected.length; i++) {
    const slug = selected[i];
    if (slug && item.folderPath[i]?.slug !== slug) return false;
  }
  if (!query) return true;
  const blob = [
    item.title,
    item.description ?? '',
    item.entry ?? '',
    item.url ?? '',
    ...item.folderPath.map((p) => `${p.item} ${p.slug}`),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(query);
}

function CardsGrid({
  items,
  highlightQuery,
}: {
  items: CategoryFilterItem[];
  highlightQuery?: string;
}) {
  return (
    <Cards className={MODULE_CARDS_GRID_CLASS}>
      {items.map((mod) => (
        <ModuleCard
          key={mod.href}
          title={mod.title}
          description={mod.description}
          badge={mod.badge}
          href={mod.href}
          code={mod.entry}
          url={mod.url}
          coverUrl={mod.coverUrl}
          dataReady={mod.dataReady}
          estimatedDuration={mod.estimatedDuration}
          minInterval={mod.minInterval}
          highlightQuery={highlightQuery}
          icon={
            mod.icon ? (
              <span className="size-full">{renderModuleIcon(mod.icon, 'size-full')}</span>
            ) : undefined
          }
        />
      ))}
    </Cards>
  );
}

export function CategoryFilterPanel({
  items,
  facet,
  childOrders = {},
  depth,
  layout,
  search = true,
  labels = true,
  pagination = {
    enable: false,
    size: DEFAULT_CATEGORY_FILTER_PAGE_SIZE,
    style: 'button',
  },
  sectionAnchorId,
}: {
  items: CategoryFilterItem[];
  facet: CategoryFilterFacet | null;
  childOrders?: Record<string, string[]>;
  depth?: number;
  layout?: CategoryFilterLayout;
  search?: boolean;
  labels?: boolean;
  pagination?: CategoryFilterPagination;
  sectionAnchorId?: string;
}) {
  const maxDepth =
    typeof depth === 'number' && depth >= 1 ? depth : Number.POSITIVE_INFINITY;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<(string | null)[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const normalized = search ? normalizeQuery(query) : '';
  const highlightQuery = normalized || undefined;

  const rows = useMemo(() => {
    if (!usesFacetRows(layout)) return [];
    return planFacetRows({
      items,
      facet,
      childOrders,
      selected,
      maxDepth,
    });
  }, [items, facet, childOrders, selected, maxDepth, layout]);

  const firstAxisAnchors = useMemo(() => {
    if (layout !== 'tabs' || !sectionAnchorId || !facet || facet.options.length < 1) {
      return [];
    }
    return facet.options.map((opt) => ({
      key: opt.slug,
      anchorId: `${sectionAnchorId}-${opt.slug}`,
    }));
  }, [layout, sectionAnchorId, facet]);

  const pathname = usePathname();

  useEffect(() => {
    if (firstAxisAnchors.length === 0) return;
    const applyHash = () => {
      const hit = selectedSlugFromCategoryFilterHash(
        window.location.hash,
        firstAxisAnchors,
        sectionAnchorId,
      );
      if (hit.kind === 'ignore') return;
      if (hit.kind === 'all') {
        setSelected((prev) => (prev.some(Boolean) ? [] : prev));
        return;
      }
      setSelected((prev) => (prev[0] === hit.slug ? prev : [hit.slug]));
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    window.addEventListener('popstate', applyHash);
    window.addEventListener(DOCS_HASH_EVENT, applyHash);
    return () => {
      window.removeEventListener('hashchange', applyHash);
      window.removeEventListener('popstate', applyHash);
      window.removeEventListener(DOCS_HASH_EVENT, applyHash);
    };
  }, [firstAxisAnchors, sectionAnchorId]);

  const onSelectFacet = useCallback(
    (index: number, slug: string | null) => {
      setSelected((prev) => {
        const next = prev.slice(0, index);
        next[index] = slug;
        return next;
      });
      setExpanded((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (Number(key) > index) delete next[Number(key)];
        }
        return next;
      });
      if (index !== 0 || firstAxisAnchors.length === 0) return;
      const anchor = slug
        ? firstAxisAnchors.find((item) => item.key === slug)
        : null;
      const hash =
        anchor?.anchorId ??
        (sectionAnchorId ? sectionAnchorId : '');
      window.history.replaceState(
        null,
        '',
        hash ? `${pathname}#${hash}` : pathname,
      );
      notifyDocsHashChange();
    },
    [firstAxisAnchors, pathname, sectionAnchorId],
  );

  const filtered = useMemo(
    () => items.filter((it) => itemMatches(it, normalized, selected)),
    [items, normalized, selected],
  );

  const { page, setPage, start, end, hasMore, loadMore } = useCategoryFilterWindow({
    total: filtered.length,
    enable: pagination.enable,
    size: pagination.size,
    resetKey: `${normalized}|${selected.join(',')}`,
  });
  const visible = filtered.slice(start, end);
  const pages = pageCount(filtered.length, pagination.size);

  const hasNarrow = selected.some(Boolean) || Boolean(normalized);

  return (
    <div
      className="not-prose w-full space-y-4"
      data-category-filter-layout={layout ?? 'chips'}
    >
      {search ? (
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fd-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名称或关键词"
            className={cn(
              'w-full rounded-xl border border-fd-border bg-fd-card py-2.5 pr-3 pl-10 text-sm',
              'placeholder:text-fd-muted-foreground',
              'outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
            )}
          />
        </label>
      ) : null}

      {usesFacetRows(layout) && rows.length > 0 ? (
        <div
          className={cn(
            labels
              ? 'grid grid-cols-1 items-start gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)]'
              : 'flex flex-col gap-2',
          )}
        >
          {rows.map((row) => (
            <FacetRow
              key={row.index}
              axisTitle={row.axisTitle}
              facet={row.facet}
              allCount={row.allCount}
              selected={selected[row.index] ?? null}
              expanded={Boolean(expanded[row.index])}
              showLabel={labels}
              onToggleExpand={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [row.index]: !prev[row.index],
                }))
              }
              onSelect={(slug) => onSelectFacet(row.index, slug)}
            />
          ))}
        </div>
      ) : null}

      {firstAxisAnchors.length > 0 ? (
        <div className="pointer-events-none relative h-0" aria-hidden>
          {firstAxisAnchors.map((anchor, index) => (
            <span
              key={anchor.key}
              id={anchor.anchorId}
              data-category-filter-anchor=""
              className="absolute block scroll-mt-20"
              style={{ top: `${index * 2}px` }}
            />
          ))}
        </div>
      ) : null}

      <div className="flex min-h-8 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-xs text-fd-muted-foreground">
          {hasNarrow
            ? `已匹配 ${filtered.length} / ${items.length} 项`
            : `共 ${filtered.length} 项`}
        </p>
        {pagination.enable ? (
          <CategoryFilterPager
            page={page}
            totalPages={pages}
            style={pagination.style}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      {layout === 'stack' ? (
        <StackResults
          items={visible}
          facet={facet}
          highlightQuery={highlightQuery}
        />
      ) : layout === 'table' ? (
        filtered.length === 0 ? (
          <EmptyHint />
        ) : (
          <CategoryFilterTable items={visible} highlightQuery={highlightQuery} />
        )
      ) : filtered.length === 0 ? (
        <EmptyHint />
      ) : (
        <CardsGrid
          items={visible}
          highlightQuery={highlightQuery}
        />
      )}

      {!pagination.enable && hasMore ? (
        <LoadMoreSentinel onVisible={loadMore} />
      ) : null}
    </div>
  );
}

function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        onVisible();
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);

  return <div ref={ref} className="h-8" aria-hidden />;
}

function EmptyHint() {
  return (
    <p className="rounded-xl border border-dashed border-fd-border px-4 py-10 text-center text-sm text-fd-muted-foreground">
      没有匹配的内容
    </p>
  );
}

function StackResults({
  items,
  facet,
  highlightQuery,
}: {
  items: CategoryFilterItem[];
  facet: CategoryFilterFacet | null;
  highlightQuery?: string;
}) {
  const options = facet?.options ?? [];
  const sections = options
    .map((opt) => ({
      ...opt,
      modules: items.filter((it) => it.folderPath[0]?.slug === opt.slug),
    }))
    .filter((sec) => sec.modules.length > 0);

  if (sections.length === 0) {
    if (items.length === 0) return <EmptyHint />;
    return (
      <CardsGrid
        items={items}
        highlightQuery={highlightQuery}
      />
    );
  }

  return (
    <div>
      {sections.map((sec, index) => (
        <section key={sec.slug}>
          <h3
            id={sec.slug}
            className={cn(
              'scroll-mt-20 text-xl font-semibold tracking-tight text-fd-foreground',
              index === 0 ? 'mt-0 mb-4' : 'mt-8 mb-4',
            )}
          >
            {sec.item}
          </h3>
          <CardsGrid
            items={sec.modules}
            highlightQuery={highlightQuery}
          />
        </section>
      ))}
    </div>
  );
}

function FacetRow({
  axisTitle,
  facet,
  allCount,
  selected,
  expanded,
  showLabel,
  onToggleExpand,
  onSelect,
}: {
  axisTitle: string;
  facet: CategoryFilterFacet | null;
  allCount: number;
  selected: string | null;
  expanded: boolean;
  showLabel: boolean;
  onToggleExpand: () => void;
  onSelect: (slug: string | null) => void;
}) {
  const chips = facet?.options;
  const empty = !chips?.length;
  const chipsRef = useRef<HTMLDivElement>(null);
  const [canToggle, setCanToggle] = useState(false);

  useLayoutEffect(() => {
    const el = chipsRef.current;
    if (!el || empty) {
      setCanToggle(false);
      return;
    }
    const measure = () => {
      const maxHeight = el.style.maxHeight;
      const overflow = el.style.overflow;
      el.style.maxHeight = '2.25rem';
      el.style.overflow = 'hidden';
      setCanToggle(el.scrollHeight > el.clientHeight + 1);
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chips, empty, allCount]);

  return (
    <div className="contents">
      {showLabel ? (
        <div className="pt-1.5 text-sm font-medium whitespace-nowrap text-fd-muted-foreground">
          {facet?.axisTitle ?? axisTitle}
        </div>
      ) : null}
      <div className="flex min-h-9 min-w-0 items-start gap-2">
        <div
          ref={chipsRef}
          className={cn(
            'flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-2',
            !expanded && !empty && `${CHIP_ROW_MAX_CLASS} overflow-hidden`,
          )}
        >
          {empty ? (
            <span className="text-xs text-fd-muted-foreground">无下级类目</span>
          ) : (
            <>
              <FacetChip
                label="全部"
                count={allCount}
                active={selected === null}
                onClick={() => onSelect(null)}
              />
              {(chips ?? []).map((opt) => (
                <FacetChip
                  key={opt.slug}
                  label={opt.item}
                  count={opt.count}
                  icon={opt.icon}
                  active={selected === opt.slug}
                  onClick={() => onSelect(selected === opt.slug ? null : opt.slug)}
                />
              ))}
            </>
          )}
        </div>
        {canToggle ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex shrink-0 items-center gap-0.5 pt-1.5 text-xs whitespace-nowrap text-fd-muted-foreground hover:text-fd-foreground"
          >
            {expanded ? '收起' : '展开'}
            <ChevronDown
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FacetChip({
  label,
  count,
  icon,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon?: CategoryFilterFacet['options'][number]['icon'];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        active
          ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
          : 'border-fd-border/70 bg-fd-card/60 text-fd-foreground hover:border-fd-border hover:bg-fd-accent/50',
      )}
    >
      {icon ? (
        <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-fd-muted/70 p-0.5">
          {renderModuleIcon(icon, 'size-full')}
        </span>
      ) : null}
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex min-w-4.5 justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
          active
            ? 'bg-fd-primary text-fd-primary-foreground'
            : 'bg-fd-muted text-fd-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}
