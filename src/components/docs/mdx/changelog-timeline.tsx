'use client';

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  createContext,
  useContext,
  Children,
  type ReactNode,
  type ReactElement,
  type TransitionEvent,
} from 'react';
import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  GitPullRequestCreateArrow,
} from 'lucide-react';
import { cn } from '@/lib/core/cn';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TimelineCtx {
  sortedIndex: number;
  sortedLength: number;
}

const TimelineContext = createContext<TimelineCtx>({
  sortedIndex: 0,
  sortedLength: 1,
});

// ---------------------------------------------------------------------------
// Shared button styles
// ---------------------------------------------------------------------------

const outlineBtnCls =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-fd-border/60 px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

const toggleBtnCls =
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-fd-border/60 px-2.5 py-0.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

const moreBtnCls =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-fd-border/70 bg-fd-muted/20 px-3 py-2 text-sm font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function DateBadge({ date }: { date: string }) {
  return (
    <time
      dateTime={date}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/8 px-2.5 py-1 text-xs"
    >
      <CalendarDays
        className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400"
        aria-hidden
      />
      <span className="font-semibold text-violet-700 dark:text-violet-400">更新日期</span>
      <span className="font-medium tabular-nums text-fd-foreground">{date}</span>
    </time>
  );
}

function VersionBadge({ version }: { version: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/8 px-2.5 py-1 text-xs">
      <GitPullRequestCreateArrow
        className="size-3.5 shrink-0 text-sky-700 dark:text-sky-400"
        aria-hidden
      />
      <span className="font-semibold text-sky-700 dark:text-sky-400">版本</span>
      <span className="font-mono font-medium text-fd-foreground">{version}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// ChangelogEntry
// ---------------------------------------------------------------------------

type PanelPhase = 'closed' | 'opening' | 'open' | 'closing';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ChangelogEntry({
  id,
  date,
  version,
  title,
  children,
}: {
  id?: string;
  date: string;
  version?: string;
  title?: string;
  children?: ReactNode;
}) {
  const { sortedIndex, sortedLength } = useContext(TimelineContext);
  const isLast = sortedIndex === sortedLength - 1;

  // closed → opening → open → closing → closed；动画结束后再卸载正文
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<PanelPhase>('closed');

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      if (prefersReducedMotion()) {
        setPhase('closed');
      } else {
        setPhase('closing');
      }
      return;
    }

    setOpen(true);
    if (prefersReducedMotion()) {
      setPhase('open');
      return;
    }
    // 先挂载为 0fr，下一帧再切 1fr，才能播展开动画
    setPhase('opening');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'));
    });
  }, [open]);

  const handlePanelTransitionEnd = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'grid-template-rows') return;
    setPhase((current) => (current === 'closing' ? 'closed' : current));
  }, []);

  const rendered = phase !== 'closed';
  const expanded = phase === 'open';

  return (
    <div id={id} className="relative flex scroll-m-28 gap-3">
      {/* 竖线始终保留（含单条记录），与内容区等高 */}
      <div className="not-prose flex flex-col items-center">
        <span
          className="mt-[7px] size-2.5 shrink-0 rounded-full border-2 border-violet-500/70 bg-fd-background"
          aria-hidden
        />
        <span
          className={cn('mt-1 w-px flex-1 bg-violet-500/20', isLast && 'min-h-6')}
          aria-hidden
        />
      </div>

      <div className={cn('min-w-0 flex-1', isLast ? 'pb-1' : 'pb-5')}>
        <div className="not-prose flex w-full min-w-0 items-center gap-x-2.5">
          <DateBadge date={date} />
          {version && <VersionBadge version={version} />}
          {title ? (
            <span className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-fd-foreground sm:text-[17px]">
              {title}
            </span>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className={cn(toggleBtnCls, 'ml-auto')}
          >
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                open && 'rotate-180',
              )}
              aria-hidden
            />
            {open ? '收起' : '展开'}
          </button>
        </div>

        {rendered && children ? (
          <div
            onTransitionEnd={handlePanelTransitionEnd}
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  'prose max-w-none mt-2.5 rounded-lg bg-fd-muted/25 px-4 py-3 ring-1 ring-fd-border/40 transition-opacity duration-300 ease-out motion-reduce:transition-none',
                  expanded ? 'opacity-100' : 'opacity-0',
                )}
              >
                {children}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOC sync
// ---------------------------------------------------------------------------

function syncChangelogToc(
  titleId: string,
  orderedVisibleIds: string[],
  allEntryIds: string[],
) {
  if (typeof document === 'undefined' || allEntryIds.length === 0) return;

  const visible = new Set(orderedVisibleIds);
  const containers = [
    document.querySelector('#nd-toc'),
    document.querySelector('[data-toc-popover]'),
  ].filter(Boolean) as Element[];

  for (const root of containers) {
    const sectionLink = root.querySelector(`a[href="#${CSS.escape(titleId)}"]`);
    if (!sectionLink) continue;

    const parent = sectionLink.parentElement;
    if (!parent) continue;

    // Show/hide + reorder
    const links = allEntryIds
      .map((id) => root.querySelector(`a[href="#${CSS.escape(id)}"]`))
      .filter((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      const id = href.startsWith('#') ? href.slice(1) : '';
      const show = visible.has(id);
      link.style.display = show ? '' : 'none';
      link.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    let anchor: Element = sectionLink;
    for (const id of orderedVisibleIds) {
      const link = root.querySelector(`a[href="#${CSS.escape(id)}"]`);
      if (!(link instanceof HTMLAnchorElement) || link.parentElement !== parent) continue;
      parent.insertBefore(link, anchor.nextSibling);
      anchor = link;
    }
  }
}

// ---------------------------------------------------------------------------
// ChangelogTimeline
// ---------------------------------------------------------------------------

const titleTagClass =
  'm-0 min-w-0 flex-1 scroll-m-28 font-semibold tracking-tight text-fd-foreground';

function parseEntryIds(json?: string): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function getChildEntryId(child: ReactNode): string | undefined {
  if (!child || typeof child !== 'object' || !('props' in child)) return undefined;
  const props = (child as ReactElement<{ id?: string }>).props;
  return typeof props?.id === 'string' ? props.id : undefined;
}

export function ChangelogTimeline({
  count,
  title = '更新记录',
  titleDepth = 3,
  titleId,
  entryIds: entryIdsJson,
  pageSize: pageSizeProp,
  children,
}: {
  count: number;
  title?: string;
  titleDepth?: number;
  titleId?: string;
  /** JSON stringified string[] — newest-first entry anchor ids */
  entryIds?: string;
  /** 前端分页：首屏展示条数；点击「查看更多」再追加同等数量 */
  pageSize?: number;
  children?: ReactNode;
}) {
  const [sortDesc, setSortDesc] = useState(true);
  const pageSize =
    typeof pageSizeProp === 'number' && pageSizeProp > 0
      ? Math.floor(pageSizeProp)
      : undefined;
  const [visibleCount, setVisibleCount] = useState(() => pageSize ?? count);

  const multiple = count > 1;
  const allEntryIds = useMemo(() => parseEntryIds(entryIdsJson), [entryIdsJson]);
  const sectionId = titleId || '更新记录';

  const childArr = useMemo(
    () => Children.toArray(children).filter(Boolean),
    [children],
  );

  // DOM children arrive newest-first from remark
  const sortedChildren = useMemo(() => {
    return sortDesc ? childArr : [...childArr].reverse();
  }, [childArr, sortDesc]);

  const visibleChildren = useMemo(
    () => sortedChildren.slice(0, Math.min(visibleCount, sortedChildren.length)),
    [sortedChildren, visibleCount],
  );

  const visibleIds = useMemo(
    () =>
      visibleChildren
        .map(getChildEntryId)
        .filter((id): id is string => typeof id === 'string'),
    [visibleChildren],
  );

  const remaining = Math.max(0, sortedChildren.length - visibleChildren.length);

  useEffect(() => {
    syncChangelogToc(sectionId, visibleIds, allEntryIds);
  }, [sectionId, visibleIds, allEntryIds]);

  const toggleSort = useCallback(() => {
    setSortDesc((v) => !v);
    // 切换排序后回到首屏分页
    if (pageSize != null) setVisibleCount(pageSize);
  }, [pageSize]);

  const showMore = useCallback(() => {
    if (pageSize == null) return;
    setVisibleCount((n) => Math.min(count, n + pageSize));
  }, [pageSize, count]);

  const HeadingTag = (`h${Math.min(6, Math.max(1, titleDepth || 3))}`) as
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6';

  const headingSize =
    titleDepth <= 2 ? 'text-2xl' : titleDepth === 3 ? 'text-xl' : 'text-lg';

  return (
    <div className="my-4" data-changelog-timeline>
      <div className="not-prose mb-6 flex items-center gap-3">
        <HeadingTag id={sectionId} className={cn(titleTagClass, headingSize)}>
          {title}
        </HeadingTag>
        {multiple && (
          <button
            type="button"
            onClick={toggleSort}
            className={cn(outlineBtnCls, 'ml-auto shrink-0')}
            aria-label={sortDesc ? '切换为最早优先' : '切换为最新优先'}
          >
            <ArrowUpDown className="size-3" aria-hidden />
            {sortDesc ? '最新优先' : '最早优先'}
          </button>
        )}
      </div>

      <div className="flex flex-col">
        {visibleChildren.map((child, sortedIndex) => {
          const ctx: TimelineCtx = {
            sortedIndex,
            sortedLength: visibleChildren.length,
          };
          const entryId = getChildEntryId(child) ?? String(sortedIndex);
          return (
            <TimelineContext.Provider key={entryId} value={ctx}>
              {child}
            </TimelineContext.Provider>
          );
        })}
      </div>

      {pageSize != null && remaining > 0 && (
        <div className="not-prose mt-3">
          <button type="button" onClick={showMore} className={moreBtnCls}>
            查看更多
            <span className="tabular-nums text-fd-muted-foreground/80">
              [已展示 {visibleChildren.length} 条 / 剩余 {remaining} 条]
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
