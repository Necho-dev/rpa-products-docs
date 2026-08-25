'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { Folder, Item } from 'fumadocs-core/page-tree';
import { usePathname } from 'fumadocs-core/framework';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  useFolderDepth,
} from 'fumadocs-ui/components/sidebar/base';
import { cn } from '@/lib/core/cn';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import type { SidebarFolderWithBadge, SidebarItemWithBadge } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';
import {
  folderHasMatch,
  getSidebarMatchId,
  highlightSearchMatch,
  nodeMatchesQuery,
  sidebarActiveMatchRowClass,
  useSidebarTreeSearch,
} from '@/components/docs/sidebar-tree-search';

/** 与 `fumadocs-ui/layouts/docs/slots/sidebar` 中 itemVariants 一致；双行时顶对齐图标与标题行 */
const rowBase =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_img]:size-full [&_img]:object-contain';
/** 双行时顶对齐：Lucide svg 与平台 favicon 外框 span 均微调 */
const rowWithSubline = 'items-start [&>svg]:mt-0.5 [&>span]:mt-0.5';

const linkRest =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors';

const buttonRest =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none';

const highlight =
  "data-[active=true]:before:content-[''] data-[active=true]:before:bg-fd-primary data-[active=true]:before:absolute data-[active=true]:before:w-px data-[active=true]:before:inset-y-2.5 data-[active=true]:before:inset-s-2.5";

/** 祖先文件夹标题/entry 命中时，强制展示整棵子树 */
const ForceShowChildrenContext = createContext(false);

function useForceShowChildren() {
  return useContext(ForceShowChildrenContext);
}

function normalizePath(url: string) {
  if (url.length > 1 && url.endsWith('/')) return url.slice(0, -1);
  return url;
}

function isActiveUrl(href: string, pathname: string, nested = false) {
  const h = normalizePath(href);
  const p = normalizePath(pathname);
  return h === p || (nested && p.startsWith(`${h}/`));
}

/** 导航模式（双栏未锁定）高亮右栏当前页；对照模式跟左栏 pathname */
function useSidebarActivePath(): string {
  const pathname = usePathname();
  const peek = useDocPeek();
  if (peek?.open && !peek.pinned && peek.target) return peek.target.path;
  return pathname;
}

function getItemOffset(depth: number) {
  return `calc(${2 + 3 * depth} * var(--spacing))`;
}

/**
 * 侧栏标签层级：按「与叶子相同的缩进档位」递进（见 FolderLabelRow 的 padding 用 depth-1）。
 * 父行需带 `group`，标签用 `group-hover` / `group-data-[active=true]` 与 `linkRest` 的 hover/active 对齐。
 */
function depthLabelClass(visualDepth: number) {
  if (visualDepth <= 0)
    return 'text-[15px] font-bold leading-snug tracking-tight text-fd-foreground';
  if (visualDepth === 1)
    return 'text-[13.5px] font-medium text-fd-muted-foreground';
  if (visualDepth === 2)
    return 'text-[12.5px] font-normal text-fd-muted-foreground/90';
  return 'text-[11px] font-normal text-fd-muted-foreground/75';
}

function TruncatedLabel({ children, depth, className }: { children: ReactNode; depth: number; className?: string }) {
  return (
    <span
      className={cn(
        'min-w-0 w-full max-w-full truncate text-start transition-colors',
        depthLabelClass(depth),
        'group-hover:text-fd-accent-foreground/80 group-data-[active=true]:text-fd-primary',
        className,
      )}
    >
      {children}
    </span>
  );
}

function PageTreeSubline({ children }: { children: ReactNode }) {
  return (
    <span className="w-full min-w-0 max-w-full truncate font-mono text-[12px] leading-tight text-fd-muted-foreground/80 [&_mark]:font-mono">
      {children}
    </span>
  );
}

function DocBadge({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none text-fd-card"
      style={{ backgroundColor: color ?? '#6366f1' }}
    >
      {label}
    </span>
  );
}

/** 页面树叶子：主标题 + 可选 `entry`（由 frontmatter 经插件挂到 `description`） */
export function DocsSidebarTreeItem({ item }: { item: Item }) {
  const pathname = useSidebarActivePath();
  const depth = useFolderDepth();
  const { normalizedQuery, isFiltering, isActiveMatch } = useSidebarTreeSearch();
  const forceShow = useForceShowChildren();
  const selfMatches = Boolean(normalizedQuery && nodeMatchesQuery(item, normalizedQuery));

  // 有命中时才过滤；0 命中保留完整目录树
  if (isFiltering && !forceShow && !selfMatches) {
    return null;
  }

  const hasSub = item.description != null && item.description !== '';
  const badge = (item as SidebarItemWithBadge).badge;
  const matchId = getSidebarMatchId(item);
  const variant = selfMatches && isActiveMatch(matchId) ? 'active' : 'match';
  const nameNode = highlightSearchMatch(item.name, normalizedQuery, variant);
  const descNode = hasSub
    ? highlightSearchMatch(item.description, normalizedQuery, variant)
    : null;

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      active={isActiveUrl(item.url, pathname)}
      icon={item.icon}
      data-sidebar-match-id={selfMatches ? matchId : undefined}
      className={cn(
        rowBase,
        linkRest,
        depth >= 1 && highlight,
        'group min-w-0 w-full',
        hasSub && rowWithSubline,
        variant === 'active' && sidebarActiveMatchRowClass,
      )}
      style={{ paddingInlineStart: getItemOffset(depth) }}
    >
      <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
          <TruncatedLabel depth={depth} className="min-h-0 min-w-0 flex-1">
            {nameNode}
          </TruncatedLabel>
          {badge ? <DocBadge label={badge.label} color={badge.color} /> : null}
        </div>
        {hasSub ? <PageTreeSubline>{descNode}</PageTreeSubline> : null}
      </div>
    </SidebarItem>
  );
}

function FolderLabelRow({
  item,
  pathname,
  normalizedQuery,
  matchId,
  selfMatches,
  isActive,
}: {
  item: Folder;
  pathname: string;
  normalizedQuery: string;
  matchId: string;
  selfMatches: boolean;
  isActive: boolean;
}) {
  const depth = useFolderDepth();
  /** 与 `getItemOffset(depth - 1)` 一致：文件夹标题与「同缩进档位」的叶子共用同一套字阶 */
  const labelDepth = Math.max(0, depth - 1);
  const pad = getItemOffset(labelDepth);
  const hasSub = item.description != null && item.description !== '';
  const badge = (item as SidebarFolderWithBadge).badge;
  const variant = selfMatches && isActive ? 'active' : 'match';
  const nameNode = highlightSearchMatch(item.name, normalizedQuery, variant);
  const descNode = hasSub
    ? highlightSearchMatch(item.description, normalizedQuery, variant)
    : null;
  const matchAttr = selfMatches ? matchId : undefined;
  const activeRow = variant === 'active' ? sidebarActiveMatchRowClass : undefined;

  if (item.index) {
    return (
      <SidebarFolderLink
        href={item.index.url}
        active={isActiveUrl(item.index.url, pathname)}
        external={item.index.external}
        data-sidebar-match-id={matchAttr}
        className={cn(
          rowBase,
          linkRest,
          depth > 1 && highlight,
          'group w-full min-w-0',
          hasSub && rowWithSubline,
          activeRow,
        )}
        style={{ paddingInlineStart: pad }}
      >
        {item.icon}
        <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
            <TruncatedLabel depth={labelDepth} className="min-h-0 min-w-0 flex-1">
              {nameNode}
            </TruncatedLabel>
            {badge ? <DocBadge label={badge.label} color={badge.color} /> : null}
          </div>
          {hasSub ? <PageTreeSubline>{descNode}</PageTreeSubline> : null}
        </div>
      </SidebarFolderLink>
    );
  }

  return (
    <SidebarFolderTrigger
      data-sidebar-match-id={matchAttr}
      className={cn(
        rowBase,
        buttonRest,
        'group w-full min-w-0',
        hasSub && rowWithSubline,
        activeRow,
      )}
      style={{ paddingInlineStart: pad }}
    >
      {item.icon}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
          <TruncatedLabel depth={labelDepth} className="min-h-0 min-w-0 flex-1">
            {nameNode}
          </TruncatedLabel>
          {badge ? <DocBadge label={badge.label} color={badge.color} /> : null}
        </div>
        {hasSub ? <PageTreeSubline>{descNode}</PageTreeSubline> : null}
      </div>
    </SidebarFolderTrigger>
  );
}

/** 页面树文件夹：包名 / 目录名单行省略 */
export function DocsSidebarTreeFolder({
  item,
  children,
}: {
  item: Folder;
  children: React.ReactNode;
}) {
  const path = useTreePath();
  const pathname = useSidebarActivePath();
  const { normalizedQuery, isFiltering, isActiveMatch } = useSidebarTreeSearch();
  const parentForceShow = useForceShowChildren();
  const folderMatches = nodeMatchesQuery(item, normalizedQuery);
  const hasDescendantMatch = Boolean(
    isFiltering && folderHasMatch(item, normalizedQuery),
  );

  // 有命中时才过滤；0 命中保留完整目录树
  if (isFiltering && !parentForceShow && !hasDescendantMatch) {
    return null;
  }

  // 本文件夹命中（或祖先已强制）→ 子树全部展示
  const forceShowChildren =
    parentForceShow || Boolean(isFiltering && folderMatches);

  const matchId = getSidebarMatchId(item);
  const selfMatches = Boolean(isFiltering && folderMatches);

  // 筛选时强制展开含命中的文件夹；清除后勿传 false，否则会盖掉 defaultOpenLevel 导致整树折叠
  const defaultOpen =
    isFiltering && hasDescendantMatch ? true : item.defaultOpen;

  return (
    <SidebarFolder
      collapsible={item.collapsible}
      active={path.includes(item)}
      defaultOpen={defaultOpen}
    >
      <FolderLabelRow
        item={item}
        pathname={pathname}
        normalizedQuery={normalizedQuery}
        matchId={matchId}
        selfMatches={selfMatches}
        isActive={selfMatches && isActiveMatch(matchId)}
      />
      <ForceShowChildrenContext.Provider value={forceShowChildren}>
        <SidebarFolderContent>{children}</SidebarFolderContent>
      </ForceShowChildrenContext.Provider>
    </SidebarFolder>
  );
}
