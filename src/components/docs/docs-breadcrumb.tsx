'use client';

import { Fragment, useMemo, type ComponentProps, type ReactNode } from 'react';
import Link from 'fumadocs-core/link';
import { useTreeContext, useTreePath } from 'fumadocs-ui/contexts/tree';
import { cn } from '@/lib/core/cn';

type Crumb = {
  name: ReactNode;
  url?: string;
};

/**
 * 飞书式弱化面包屑：只展示祖先（分区 + 中间目录），不展示当前页
 *（当前页已是下方 H1，再写一遍会重复）。
 */
export function DocsBreadcrumb({ className, ...props }: ComponentProps<'nav'>) {
  const path = useTreePath();
  const { root } = useTreeContext();

  const items = useMemo(() => buildCrumbs(path, root.name), [path, root.name]);

  // 仅一层（通常是分区名）时与顶栏 Tab 重复，不展示
  if (items.length < 2) return null;

  return (
    <nav
      aria-label="面包屑"
      {...props}
      className={cn(
        // 字号 14px（+2）；-mb-2 收紧与标题的 gap-4 间距
        '-mb-2 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[14px] leading-5 text-fd-muted-foreground/85',
        className,
      )}
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <span aria-hidden className="shrink-0 text-fd-muted-foreground/45">
              ›
            </span>
          ) : null}
          {item.url ? (
            <Link
              href={item.url}
              className="min-w-0 truncate rounded-sm px-0.5 transition-colors hover:bg-fd-accent/60 hover:text-fd-foreground/80"
            >
              {item.name}
            </Link>
          ) : (
            <span className="min-w-0 truncate px-0.5">{item.name}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

function buildCrumbs(
  path: ReturnType<typeof useTreePath>,
  fallbackRootName: ReactNode,
): Crumb[] {
  const items: Crumb[] = [];

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    if (node.type === 'separator' || node.type === 'page') continue;

    if (node.type === 'folder') {
      if (node.root) {
        // 分区根：用文件夹自身名称（getBreadcrumbItemsFromPath 会误用 tree.name）
        items.length = 0;
        items.push({
          name: node.name ?? fallbackRootName,
          url: node.index?.url,
        });
        continue;
      }

      // 下一节点即该 folder 的 index 页时，folder 名会与标题重复，跳过
      const next = path[i + 1];
      if (next && node.index === next) continue;

      items.push({
        name: node.name,
        url: node.index?.url,
      });
    }
  }

  return items;
}
