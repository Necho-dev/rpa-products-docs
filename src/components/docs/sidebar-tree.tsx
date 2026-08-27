'use client';

import {
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Folder, Item } from 'fumadocs-core/page-tree';
import { usePathname } from 'fumadocs-core/framework';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import {
  SidebarFolder,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  useFolder,
  useFolderDepth,
} from 'fumadocs-ui/components/sidebar/base';
import { cn } from '@/lib/core/cn';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { useCategoryNav } from '@/components/docs/category-nav-context';
import {
  sidebarNodePassesCategoryNav,
  withCategoryNavQuery,
} from '@/lib/docs/source/category-nav';
import type { SidebarFolderWithBadge, SidebarItemWithBadge } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';
import {
  folderHasBadge,
  folderHasMatch,
  getSidebarMatchId,
  highlightSearchMatch,
  nodeMatchesQuery,
  nodePassesBadge,
  sidebarActiveMatchRowClass,
  useSidebarTreeSearch,
} from '@/components/docs/sidebar-tree-search';

/** 与 `fumadocs-ui/layouts/docs/slots/sidebar` 中 itemVariants 一致 */
const rowBase =
  'relative flex flex-row items-start gap-2.5 rounded-xl px-2 py-2 text-start text-fd-muted-foreground [&>svg[data-icon]]:size-4 [&>svg[data-icon]]:shrink-0 [&>svg[data-icon]]:self-center [&_img]:size-full [&_img]:object-contain';

/** 浅灰底磁贴；边长只跟标题行等高，副行 CODE 不计入。 */
const iconTileClass =
  'inline-flex aspect-square size-[var(--docs-sidebar-icon,1.3125rem)] min-h-[var(--docs-sidebar-icon,1.3125rem)] min-w-[var(--docs-sidebar-icon,1.3125rem)] shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-fd-muted/70 p-0.5 box-border dark:bg-fd-secondary/90 [&_svg]:size-full';

function SidebarIconSlot({ children }: { children?: ReactNode }) {
  if (!children) return null;
  if (
    isValidElement(children) &&
    (children.props as { 'data-platform-icon'?: unknown })['data-platform-icon'] !==
      undefined
  ) {
    return children;
  }
  return (
    <span className={iconTileClass} data-sidebar-icon-tile="" aria-hidden>
      {children}
    </span>
  );
}

function sidebarIconStyle(
  pad: string,
  role: SidebarRowRole,
  folderNesting = 0,
  pageDepth = 0,
): { paddingInlineStart: string; ['--docs-sidebar-icon']: string } {
  /** 按缩进档位选尺寸：根级（含概览）同一套，子平台同一套，再深的文档叶子同一套。 */
  let icon: string;
  if (role === 'folder') {
    icon =
      folderNesting <= 0
        ? 'var(--docs-sidebar-icon-menu)'
        : 'var(--docs-sidebar-icon-sub)';
  } else {
    icon =
      pageDepth <= 0
        ? 'var(--docs-sidebar-icon-menu)'
        : 'var(--docs-sidebar-icon-page)';
  }
  return { paddingInlineStart: pad, '--docs-sidebar-icon': icon };
}

const textStackClass =
  'flex min-w-0 flex-1 flex-col justify-start gap-0.5';

const linkRest =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors';

const buttonRest =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none';

/** 仅文档叶子：短竖条，落在行内边距里，不贴容器左缘、不压图标。 */
const pageActiveMark =
  "data-[active=true]:before:content-[''] data-[active=true]:before:absolute data-[active=true]:before:inset-y-[15px] data-[active=true]:before:start-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-fd-primary";

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
 * 侧栏行角色：文档叶子始终同一套字阶；菜单按嵌套深度拉开字重/深浅，
 * 最深一档仍重于文档，避免子平台和连接器抢同一视觉档。
 */
type SidebarRowRole = 'folder' | 'page';

function folderLabelClass(nesting: number) {
  if (nesting <= 0) {
    return 'text-[15px] font-bold leading-snug tracking-tight text-fd-foreground';
  }
  if (nesting === 1) {
    return 'text-[14px] font-semibold leading-snug text-fd-foreground/90';
  }
  return 'text-[13.5px] font-medium leading-snug text-fd-foreground/85';
}

function roleLabelClass(role: SidebarRowRole, folderNesting = 0) {
  if (role === 'folder') return folderLabelClass(folderNesting);
  return 'text-[13.5px] font-medium text-fd-muted-foreground';
}

function TruncatedLabel({
  children,
  role,
  folderNesting = 0,
  className,
}: {
  children: ReactNode;
  role: SidebarRowRole;
  folderNesting?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'min-w-0 w-full max-w-full truncate text-start transition-colors',
        roleLabelClass(role, folderNesting),
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
    <span className="w-full min-w-0 max-w-full truncate font-mono text-[12px] leading-tight text-fd-muted-foreground [&_mark]:font-mono">
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
  const { normalizedQuery, isFiltering, isActiveMatch, badgeLabel } =
    useSidebarTreeSearch();
  const categoryNav = useCategoryNav();
  const forceShow = useForceShowChildren();
  const selfMatches = Boolean(normalizedQuery && nodeMatchesQuery(item, normalizedQuery));

  if (
    depth === 0 &&
    categoryNav.model &&
    !sidebarNodePassesCategoryNav({
      selectedKey: categoryNav.selectedKey,
      nodeUrl: item.url,
      keyByUrl: categoryNav.model.keyByUrl,
      prefix: categoryNav.model.prefix,
      isFiltering,
    })
  ) {
    return null;
  }

  // badge 筛选始终生效；搜索仅在有命中时过滤。0 搜索命中保留完整目录（仍受 badge 约束）
  if (badgeLabel && !nodePassesBadge(item, badgeLabel)) {
    return null;
  }
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

  /**
   * FolderContext 的 depth 在文件夹组件上 +1，子页面与该文件夹标题同 depth。
   * 概览不在任何 SidebarFolder 内，depth === 0；叶子文档 depth >= 1。
   */
  const isSectionIndex = depth === 0;

  return (
    <SidebarItem
      href={
        item.external
          ? item.url
          : withCategoryNavQuery(item.url, categoryNav.selectedKey)
      }
      external={item.external}
      active={isActiveUrl(item.url, pathname)}
      icon={<SidebarIconSlot>{item.icon}</SidebarIconSlot>}
      data-sidebar-match-id={selfMatches ? matchId : undefined}
      className={cn(
        rowBase,
        linkRest,
        !isSectionIndex && pageActiveMark,
        'group min-w-0 w-full',
        variant === 'active' && sidebarActiveMatchRowClass,
      )}
      style={
        isSectionIndex
          ? sidebarIconStyle(getItemOffset(0), 'folder', 0)
          : sidebarIconStyle(getItemOffset(depth), 'page', 0, depth)
      }
    >
      <div className={textStackClass}>
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
          <TruncatedLabel
            role={isSectionIndex ? 'folder' : 'page'}
            folderNesting={0}
            className="min-h-0 min-w-0 flex-1"
          >
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
  selectedKey,
}: {
  item: Folder;
  pathname: string;
  normalizedQuery: string;
  matchId: string;
  selfMatches: boolean;
  isActive: boolean;
  selectedKey: string | null;
}) {
  const depth = useFolderDepth();
  const folderNesting = Math.max(0, depth - 1);
  /** 缩进仍跟树深度走；标题字阶按菜单嵌套，不与文档叶子共用档位。 */
  const pad = getItemOffset(folderNesting);
  const hasSub = item.description != null && item.description !== '';
  const folder = item as SidebarFolderWithBadge;
  const badge = folder.badge;
  const variant = selfMatches && isActive ? 'active' : 'match';
  const nameNode = highlightSearchMatch(item.name, normalizedQuery, variant);
  const descNode = hasSub
    ? highlightSearchMatch(item.description, normalizedQuery, variant)
    : null;
  const matchAttr = selfMatches ? matchId : undefined;
  const activeRow = variant === 'active' ? sidebarActiveMatchRowClass : undefined;

  if (item.index && folder.folderLink !== false) {
    return (
      <SidebarFolderLink
        href={
          item.index.external
            ? item.index.url
            : withCategoryNavQuery(item.index.url, selectedKey)
        }
        active={isActiveUrl(item.index.url, pathname)}
        external={item.index.external}
        data-sidebar-match-id={matchAttr}
        className={cn(
          rowBase,
          linkRest,
          'group w-full min-w-0',
          activeRow,
        )}
        style={sidebarIconStyle(pad, 'folder', folderNesting)}
      >
        <SidebarIconSlot>{item.icon}</SidebarIconSlot>
        <div className={textStackClass}>
          <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
            <TruncatedLabel
              role="folder"
              folderNesting={folderNesting}
              className="min-h-0 min-w-0 flex-1"
            >
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
        activeRow,
      )}
      style={sidebarIconStyle(pad, 'folder', folderNesting)}
    >
      <SidebarIconSlot>{item.icon}</SidebarIconSlot>
      <div className={textStackClass}>
        <div className="flex min-w-0 flex-1 flex-row items-center gap-1.5">
          <TruncatedLabel
            role="folder"
            folderNesting={folderNesting}
            className="min-h-0 min-w-0 flex-1"
          >
            {nameNode}
          </TruncatedLabel>
          {badge ? <DocBadge label={badge.label} color={badge.color} /> : null}
        </div>
        {hasSub ? <PageTreeSubline>{descNode}</PageTreeSubline> : null}
      </div>
    </SidebarFolderTrigger>
  );
}

/** 收起时只隐藏子树，不卸载，避免平台图标 <img> 再次请求 */
function DocsSidebarFolderContent({ children }: { children: React.ReactNode }) {
  const folder = useFolder();
  if (!folder) return null;
  const { open } = folder;
  return (
    <div
      data-state={open ? 'open' : 'closed'}
      inert={!open || undefined}
      className={cn(
        'grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function FolderOpenCommand({
  epoch,
  openAll,
  isFiltering,
}: {
  epoch: number;
  openAll: boolean;
  isFiltering: boolean;
}) {
  const folder = useFolder();
  const seenEpoch = useRef(0);
  const setOpen = folder?.setOpen;

  useLayoutEffect(() => {
    if (!setOpen || isFiltering || epoch === 0 || epoch === seenEpoch.current) return;
    seenEpoch.current = epoch;
    setOpen(openAll);
  }, [epoch, openAll, isFiltering, setOpen]);

  return null;
}

export function DocsSidebarTreeFolder({
  item,
  children,
}: {
  item: Folder;
  children: React.ReactNode;
}) {
  const path = useTreePath();
  const pathname = useSidebarActivePath();
  const { normalizedQuery, isFiltering, isActiveMatch, badgeLabel, folderOpenEpoch, folderOpenAll } =
    useSidebarTreeSearch();
  const categoryNav = useCategoryNav();
  const parentForceShow = useForceShowChildren();
  const folderMatches = nodeMatchesQuery(item, normalizedQuery);
  const depth = useFolderDepth();

  if (
    depth === 0 &&
    categoryNav.model &&
    !sidebarNodePassesCategoryNav({
      selectedKey: categoryNav.selectedKey,
      nodeUrl: item.index?.url,
      keyByUrl: categoryNav.model.keyByUrl,
      prefix: categoryNav.model.prefix,
      isFiltering,
    })
  ) {
    return null;
  }
  const hasDescendantMatch = Boolean(
    isFiltering && folderHasMatch(item, normalizedQuery),
  );
  const hasBadgeDescendant = folderHasBadge(item, badgeLabel);

  if (badgeLabel && !hasBadgeDescendant) {
    return null;
  }
  // 有命中时才按搜索过滤；0 命中保留完整目录树
  if (isFiltering && !parentForceShow && !hasDescendantMatch) {
    return null;
  }

  // 本文件夹命中（或祖先已强制）→ 子树全部展示
  const forceShowChildren =
    parentForceShow || Boolean(isFiltering && folderMatches);

  const matchId = getSidebarMatchId(item);
  const selfMatches = Boolean(isFiltering && folderMatches);

  // 筛选时强制展开含命中的文件夹；清除后勿传 false，否则会盖掉 defaultOpenLevel 导致整树折叠
  // 全部展开/折叠：命令内部 setOpen，不 remount，避免图标 <img> 重新请求
  const defaultOpen =
    isFiltering && hasDescendantMatch
      ? true
      : folderOpenEpoch > 0
        ? folderOpenAll
        : item.defaultOpen;
  const keepActivePathOpen = !(folderOpenEpoch > 0 && !folderOpenAll);

  return (
    <SidebarFolder
      collapsible={item.collapsible}
      active={keepActivePathOpen && path.includes(item)}
      defaultOpen={defaultOpen}
    >
      <FolderOpenCommand
        epoch={folderOpenEpoch}
        openAll={folderOpenAll}
        isFiltering={isFiltering}
      />
      <FolderLabelRow
        item={item}
        pathname={pathname}
        normalizedQuery={normalizedQuery}
        matchId={matchId}
        selfMatches={selfMatches}
        isActive={selfMatches && isActiveMatch(matchId)}
        selectedKey={categoryNav.selectedKey}
      />
      <ForceShowChildrenContext.Provider value={forceShowChildren}>
        <DocsSidebarFolderContent>{children}</DocsSidebarFolderContent>
      </ForceShowChildrenContext.Provider>
    </SidebarFolder>
  );
}
