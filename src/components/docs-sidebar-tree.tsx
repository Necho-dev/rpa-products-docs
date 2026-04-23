'use client';

import type { ReactNode } from 'react';
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
import { cn } from '@/lib/cn';

/** 与 `fumadocs-ui/layouts/docs/slots/sidebar` 中 itemVariants 一致；双行时顶对齐图标与标题行 */
const rowBase =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0';
const rowWithSubline = 'items-start [&>svg]:mt-0.5';

const linkRest =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors';

const buttonRest =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none';

const highlight =
  "data-[active=true]:before:content-[''] data-[active=true]:before:bg-fd-primary data-[active=true]:before:absolute data-[active=true]:before:w-px data-[active=true]:before:inset-y-2.5 data-[active=true]:before:inset-s-2.5";

function normalizePath(url: string) {
  if (url.length > 1 && url.endsWith('/')) return url.slice(0, -1);
  return url;
}

function isActiveUrl(href: string, pathname: string, nested = false) {
  const h = normalizePath(href);
  const p = normalizePath(pathname);
  return h === p || (nested && p.startsWith(`${h}/`));
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
    return 'text-[14px] font-semibold leading-snug text-fd-foreground/95';
  if (visualDepth === 2)
    return 'text-[13px] font-medium text-fd-muted-foreground';
  if (visualDepth === 3)
    return 'text-[12px] font-normal text-fd-muted-foreground/90';
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
    <span className="w-full min-w-0 max-w-full truncate font-mono text-[12px] leading-tight text-fd-muted-foreground/80">
      {children}
    </span>
  );
}

/** 页面树叶子：主标题 + 可选 `entry`（由 frontmatter 经插件挂到 `description`） */
export function DocsSidebarTreeItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const depth = useFolderDepth();
  const hasSub = item.description != null && item.description !== '';
  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      active={isActiveUrl(item.url, pathname)}
      icon={item.icon}
      className={cn(
        rowBase,
        linkRest,
        depth >= 1 && highlight,
        'group min-w-0 w-full',
        hasSub && rowWithSubline,
      )}
      style={{ paddingInlineStart: getItemOffset(depth) }}
    >
      <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-0.5">
        <TruncatedLabel depth={depth} className="min-h-0">
          {item.name}
        </TruncatedLabel>
        {hasSub ? <PageTreeSubline>{item.description}</PageTreeSubline> : null}
      </div>
    </SidebarItem>
  );
}

function FolderLabelRow({ item, pathname }: { item: Folder; pathname: string }) {
  const depth = useFolderDepth();
  /** 与 `getItemOffset(depth - 1)` 一致：文件夹标题与「同缩进档位」的叶子共用同一套字阶 */
  const labelDepth = Math.max(0, depth - 1);
  const pad = getItemOffset(labelDepth);
  const hasSub = item.description != null && item.description !== '';

  if (item.index) {
    return (
      <SidebarFolderLink
        href={item.index.url}
        active={isActiveUrl(item.index.url, pathname)}
        external={item.index.external}
        className={cn(
          rowBase,
          linkRest,
          depth > 1 && highlight,
          'group w-full min-w-0',
          hasSub && rowWithSubline,
        )}
        style={{ paddingInlineStart: pad }}
      >
        {item.icon}
        <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-0.5">
          <TruncatedLabel depth={labelDepth} className="min-h-0">
            {item.name}
          </TruncatedLabel>
          {hasSub ? <PageTreeSubline>{item.description}</PageTreeSubline> : null}
        </div>
      </SidebarFolderLink>
    );
  }

  return (
    <SidebarFolderTrigger
      className={cn(rowBase, buttonRest, 'group w-full min-w-0', hasSub && rowWithSubline)}
      style={{ paddingInlineStart: pad }}
    >
      {item.icon}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-0.5">
        <TruncatedLabel depth={labelDepth} className="min-h-0">
          {item.name}
        </TruncatedLabel>
        {hasSub ? <PageTreeSubline>{item.description}</PageTreeSubline> : null}
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
  const pathname = usePathname();

  return (
    <SidebarFolder
      collapsible={item.collapsible}
      active={path.includes(item)}
      defaultOpen={item.defaultOpen}
    >
      <FolderLabelRow item={item} pathname={pathname} />
      <SidebarFolderContent>{children}</SidebarFolderContent>
    </SidebarFolder>
  );
}
