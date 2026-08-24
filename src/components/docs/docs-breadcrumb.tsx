'use client';

import { Fragment, useMemo, type ComponentProps, type ReactNode } from 'react';
import Link from 'fumadocs-core/link';
import { useTreeContext, useTreePath } from 'fumadocs-ui/contexts/tree';
import type { Node, Root } from 'fumadocs-core/page-tree';
import { cn } from '@/lib/core/cn';
import { stripTrailingSlash } from '@/lib/docs/link-kind';

type Crumb = {
  name: ReactNode;
  url?: string;
};

/**
 * 弱化面包屑：只展示祖先（分区 + 中间目录），不展示当前页
 *（当前页已是下方 H1，再写一遍会重复）。
 *
 * `pageUrl` 用于右栏 peek：按目标文档在整棵树上的路径生成，而不是当前左栏页面。
 */
export function DocsBreadcrumb({
  className,
  pageUrl,
  ...props
}: ComponentProps<'nav'> & { pageUrl?: string }) {
  const currentPath = useTreePath();
  const { root, full } = useTreeContext();

  const items = useMemo(() => {
    const path = pageUrl ? findTreePath(full, pageUrl) : currentPath;
    return buildCrumbs(path, root.name);
  }, [currentPath, full, pageUrl, root.name]);

  // 左栏：仅一层时与顶栏 Tab 重复，不展示
  // 右栏 peek：按目标文档路径展示，有祖先就显示
  if (pageUrl ? items.length === 0 : items.length < 2) return null;

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

function nodeUrl(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === 'page') return node.url;
  if (node.type === 'folder') return node.index?.url;
  return undefined;
}

function findTreePath(tree: Root, url: string): Node[] {
  const target = stripTrailingSlash(url);

  const walk = (nodes: Node[], acc: Node[]): Node[] | null => {
    for (const node of nodes) {
      if (node.type === 'separator') continue;

      if (node.type === 'page' && stripTrailingSlash(node.url) === target) {
        return [...acc, node];
      }

      if (node.type === 'folder') {
        const nextAcc = [...acc, node];
        if (node.index && stripTrailingSlash(node.index.url) === target) {
          return [...nextAcc, node.index];
        }
        const found = walk(node.children, nextAcc);
        if (found) return found;
      }
    }
    return null;
  };

  return walk(tree.children, []) ?? [];
}

function buildCrumbs(path: Node[], fallbackRootName: ReactNode): Crumb[] {
  const items: Crumb[] = [];

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    if (node.type === 'separator' || node.type === 'page') continue;

    if (node.type === 'folder') {
      if (node.root) {
        items.length = 0;
        items.push({
          name: node.name ?? fallbackRootName,
          url: node.index?.url,
        });
        continue;
      }

      const next = path[i + 1];
      if (next && node.index === next) continue;

      items.push({
        name: node.name,
        url: node.index?.url ?? nodeUrl(next),
      });
    }
  }

  return items;
}
