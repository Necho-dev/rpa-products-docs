'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react';
import type { Folder, Item, Node } from 'fumadocs-core/page-tree';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { cn } from '@/lib/core/cn';

export type SidebarMatchVariant = 'match' | 'active';

/** 当前定位行：浅橙底 + 细边框（对齐飞书） */
export const sidebarActiveMatchRowClass =
  'bg-orange-50/90 outline outline-1 -outline-offset-1 outline-orange-300/80 dark:bg-orange-500/10 dark:outline-orange-400/45';

type SidebarTreeSearchContextValue = {
  query: string;
  normalizedQuery: string;
  setQuery: (query: string) => void;
  /** 命中节点 id 列表（文档序） */
  matchIds: string[];
  /** 由 Banner/Input 同步命中列表 */
  syncMatches: (ids: string[]) => void;
  /** 有关键词且存在命中时才过滤树；0 命中时保留完整目录 */
  isFiltering: boolean;
  /** 当前定位下标，无命中为 -1 */
  activeIndex: number;
  activeMatchId: string | null;
  goNext: () => void;
  goPrev: () => void;
  /** 节点是否为当前定位命中 */
  isActiveMatch: (matchId: string) => boolean;
};

const SidebarTreeSearchContext = createContext<SidebarTreeSearchContextValue | null>(
  null,
);

const noopSync = (_ids: string[]) => {};

const emptySearchValue: SidebarTreeSearchContextValue = {
  query: '',
  normalizedQuery: '',
  setQuery: () => {},
  matchIds: [],
  syncMatches: noopSync,
  isFiltering: false,
  activeIndex: -1,
  activeMatchId: null,
  goNext: () => {},
  goPrev: () => {},
  isActiveMatch: () => false,
};

export function SidebarTreeSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState('');
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim().toLowerCase();

  const setQuery = useCallback((next: string) => {
    const nextKey = next.trim().toLowerCase();
    setQueryState((prev) => {
      if (prev.trim().toLowerCase() !== nextKey) {
        setActiveIndex(nextKey ? 0 : -1);
      }
      return next;
    });
  }, []);

  const syncMatches = useCallback((ids: string[]) => {
    setMatchIds((prev) => {
      if (prev.length === ids.length && prev.every((id, i) => id === ids[i])) {
        return prev;
      }
      return ids;
    });
    setActiveIndex((prev) => {
      if (ids.length === 0) return -1;
      if (prev < 0 || prev >= ids.length) return 0;
      return prev;
    });
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (matchIds.length === 0) return -1;
      return (prev + 1) % matchIds.length;
    });
  }, [matchIds.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (matchIds.length === 0) return -1;
      return (prev - 1 + matchIds.length) % matchIds.length;
    });
  }, [matchIds.length]);

  const activeMatchId =
    activeIndex >= 0 && activeIndex < matchIds.length
      ? matchIds[activeIndex]
      : null;

  const isFiltering = Boolean(normalizedQuery && matchIds.length > 0);

  const isActiveMatch = useCallback(
    (matchId: string) => activeMatchId != null && activeMatchId === matchId,
    [activeMatchId],
  );

  // 定位切换后滚入可视区
  useEffect(() => {
    if (!activeMatchId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-sidebar-match-id="${CSS.escape(activeMatchId)}"]`,
    );
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeMatchId]);

  const value = useMemo(
    () => ({
      query,
      normalizedQuery,
      setQuery,
      matchIds,
      syncMatches,
      isFiltering,
      activeIndex,
      activeMatchId,
      goNext,
      goPrev,
      isActiveMatch,
    }),
    [
      query,
      normalizedQuery,
      setQuery,
      matchIds,
      syncMatches,
      isFiltering,
      activeIndex,
      activeMatchId,
      goNext,
      goPrev,
      isActiveMatch,
    ],
  );

  return (
    <SidebarTreeSearchContext.Provider value={value}>
      {children}
    </SidebarTreeSearchContext.Provider>
  );
}

export function useSidebarTreeSearch() {
  const ctx = useContext(SidebarTreeSearchContext);
  return ctx ?? emptySearchValue;
}

/** 稳定命中 id：优先 $id，否则 url / 文件夹名 */
export function getSidebarMatchId(node: Item | Folder): string {
  if (node.$id) return node.$id;
  if (node.type === 'page') return `page:${node.url}`;
  return `folder:${reactNodeToSearchText(node.name)}`;
}

/** 将 ReactNode 压成可搜索字符串（本站 name/description 基本为 string） */
export function reactNodeToSearchText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToSearchText).join('');
  if (typeof node === 'object' && 'props' in node) {
    const props = node.props as { children?: ReactNode };
    return reactNodeToSearchText(props.children);
  }
  return '';
}

function nodeSearchBlob(node: Item | Folder): string {
  const parts = [
    reactNodeToSearchText(node.name),
    reactNodeToSearchText(node.description),
  ];
  if (node.type === 'folder' && node.index) {
    parts.push(
      reactNodeToSearchText(node.index.name),
      reactNodeToSearchText(node.index.description),
    );
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function nodeMatchesQuery(
  node: Item | Folder,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;
  return nodeSearchBlob(node).includes(normalizedQuery);
}

/** 文件夹自身或任意后代是否命中（用于决定嵌套文件夹是否保留） */
export function folderHasMatch(folder: Folder, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  if (nodeMatchesQuery(folder, normalizedQuery)) return true;
  for (const child of folder.children) {
    if (child.type === 'separator') continue;
    if (child.type === 'page' && nodeMatchesQuery(child, normalizedQuery)) {
      return true;
    }
    if (child.type === 'folder' && folderHasMatch(child, normalizedQuery)) {
      return true;
    }
  }
  return false;
}

/** 深度优先收集自身命中的节点 id（文档序，供上下切换） */
export function collectMatchIds(
  root: { children: Node[] },
  normalizedQuery: string,
): string[] {
  if (!normalizedQuery) return [];
  const ids: string[] = [];

  function walk(nodes: Node[]) {
    for (const node of nodes) {
      if (node.type === 'separator') continue;
      if (node.type === 'page') {
        if (nodeMatchesQuery(node, normalizedQuery)) {
          ids.push(getSidebarMatchId(node));
        }
        continue;
      }
      if (nodeMatchesQuery(node, normalizedQuery)) {
        ids.push(getSidebarMatchId(node));
      }
      walk(node.children);
    }
  }

  walk(root.children);
  return ids;
}

/** 在文本中高亮所有 query；active 用更醒目的橙色 */
export function highlightSearchMatch(
  text: ReactNode,
  normalizedQuery: string,
  variant: SidebarMatchVariant = 'match',
): ReactNode {
  const raw = reactNodeToSearchText(text);
  if (!normalizedQuery || !raw) return text;

  const lower = raw.toLowerCase();
  const parts: ReactNode[] = [];
  let start = 0;
  let index = lower.indexOf(normalizedQuery, start);
  let key = 0;

  if (index < 0) return text;

  // 普通命中：亮黄；当前命中：深橙（对齐飞书）
  const markClass =
    variant === 'active'
      ? 'rounded-[2px] bg-[#ff9f43] px-0.5 text-inherit dark:bg-orange-500 dark:text-fd-foreground'
      : 'rounded-[2px] bg-[#ffe566] px-0.5 text-inherit dark:bg-yellow-500/45';

  while (index >= 0) {
    if (index > start) {
      parts.push(raw.slice(start, index));
    }
    parts.push(
      <mark key={`m-${key++}`} className={markClass}>
        {raw.slice(index, index + normalizedQuery.length)}
      </mark>,
    );
    start = index + normalizedQuery.length;
    index = lower.indexOf(normalizedQuery, start);
  }
  if (start < raw.length) parts.push(raw.slice(start));
  return parts;
}

/**
 * 侧栏顶部搜索框。作为 notebook `sidebar.banner`（ReactNode）挂载，
 * 不注册全局快捷键，避免与 Cmd+K 冲突。
 */
function subscribeNoop() {
  return () => {};
}

function getModKeyLabel() {
  if (typeof navigator === 'undefined') return 'Ctrl';
  const mac =
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ||
    navigator.userAgent.includes('Mac');
  return mac ? '⌘' : 'Ctrl';
}

function useModKeyLabel() {
  return useSyncExternalStore(subscribeNoop, getModKeyLabel, () => 'Ctrl');
}

export function SidebarTreeSearchInput({ className }: { className?: string }) {
  const {
    query,
    setQuery,
    normalizedQuery,
    matchIds,
    syncMatches,
    activeIndex,
    goNext,
    goPrev,
  } = useSidebarTreeSearch();
  const { root } = useTreeContext();
  const { setOpenSearch, enabled: searchEnabled } = useSearchContext();
  const modKey = useModKeyLabel();
  const rootId = root.$id ?? '';
  const hasQuery = Boolean(normalizedQuery);
  const total = matchIds.length;
  const current = total > 0 ? activeIndex + 1 : 0;
  const noMatch = hasQuery && total === 0;

  // 切换文档分区时清空，避免跨分区残留无意义过滤
  useEffect(() => {
    setQuery('');
  }, [rootId, setQuery]);

  // 同步命中列表供数量与上下定位
  useEffect(() => {
    if (!normalizedQuery) {
      syncMatches([]);
      return;
    }
    syncMatches(collectMatchIds(root, normalizedQuery));
  }, [root, normalizedQuery, syncMatches]);

  return (
    <div className={cn('relative z-20', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fd-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (!hasQuery || total === 0) return;
            if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
              e.preventDefault();
              goNext();
            } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
              e.preventDefault();
              goPrev();
            }
          }}
          placeholder="搜索目录"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="搜索目录"
          className={cn(
            'w-full rounded-lg border border-fd-border bg-fd-secondary/50 py-1.5 pl-8',
            hasQuery ? 'pr-29' : 'pr-8',
            'text-[13px] text-fd-foreground placeholder:text-fd-muted-foreground/70',
            'outline-none transition-colors',
            'focus:border-fd-primary/40 focus:bg-fd-background focus:ring-2 focus:ring-fd-primary/15',
            // 隐藏 WebKit search 自带清除钮，统一用右侧控件
            '[&::-webkit-search-cancel-button]:hidden',
          )}
        />
        {hasQuery ? (
          <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
            <span
              className="min-w-9 px-0.5 text-center text-[11px] tabular-nums text-fd-muted-foreground"
              aria-live="polite"
            >
              {total > 0 ? `${current}/${total}` : '0/0'}
            </span>
            <div className="mx-0.5 h-3.5 w-px bg-fd-border" aria-hidden />
            <div className="flex items-center rounded-md p-0.5">
              <button
                type="button"
                aria-label="上一个匹配"
                disabled={total === 0}
                onClick={goPrev}
                className="flex size-5 items-center justify-center rounded text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronUp className="size-3.5 stroke-[2.25]" />
              </button>
              <button
                type="button"
                aria-label="下一个匹配"
                disabled={total === 0}
                onClick={goNext}
                className="flex size-5 items-center justify-center rounded text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronDown className="size-3.5 stroke-[2.25]" />
              </button>
            </div>
            <button
              type="button"
              aria-label="清除筛选"
              onClick={() => setQuery('')}
              className="flex size-6 items-center justify-center rounded-md text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {noMatch ? (
        <div
          role="status"
          className="absolute top-full left-0 right-0 z-30 mt-1.5"
        >
          {/* 指向搜索框的三角箭头（对齐输入区左侧） */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1.5 left-5 h-0 w-0 border-x-[6px] border-x-transparent border-b-[7px] border-b-fd-primary drop-shadow-sm"
          />
          <div className="relative flex items-center gap-2.5 rounded-lg bg-fd-primary px-3 py-2.5 text-fd-primary-foreground shadow-lg shadow-fd-primary/25 ring-1 ring-black/5">
            <p className="min-w-0 flex-1 text-[12px] leading-snug">
              找不到想要的文档？试试内容搜索
              <span
                className="ms-1.5 inline-flex translate-y-px items-center gap-0.5 align-middle"
                aria-label={`${modKey === '⌘' ? 'Command' : 'Control'}+K`}
              >
                <kbd className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-sm border border-white/35 bg-white/18 px-1 font-sans text-[10px] font-semibold leading-none text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]">
                  {modKey}
                </kbd>
                <span className="text-[10px] font-medium text-white/70">+</span>
                <kbd className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-sm border border-white/35 bg-white/18 px-1 font-sans text-[10px] font-semibold leading-none text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]">
                  K
                </kbd>
              </span>
            </p>
            <button
              type="button"
              disabled={!searchEnabled}
              onClick={() => setOpenSearch(true)}
              className={cn(
                'shrink-0 rounded-md bg-white px-2.5 py-1 text-[12px] font-medium text-fd-primary',
                'transition-colors hover:bg-white/90',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              立即搜索
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** notebook banner 可为 FC：保留原 header children，并追加搜索框 */
export function SidebarTreeSearchBanner({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        /* z-30：盖住下方目录滚动区，悬浮提示才能露出来 */
        'relative z-30 flex flex-col gap-3 overflow-visible p-4 pb-2 empty:hidden',
        className,
      )}
    >
      {children}
      <SidebarTreeSearchInput />
    </div>
  );
}
