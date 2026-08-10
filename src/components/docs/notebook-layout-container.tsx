'use client';

import type { ComponentProps, CSSProperties } from 'react';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { cn } from '@/lib/core/cn';

/**
 * 飞书式文档网格：
 * - 顶栏全宽
 * - 侧栏靠左（左侧仅一点点留白）
 * - 正文 + TOC 在侧栏右侧剩余空间内整体居中（两侧 1fr 等分）
 */
export function NotebookLayoutContainer({
  className,
  style,
  children,
  ...props
}: ComponentProps<'div'>) {
  const {
    props: { nav },
    slots,
  } = useNotebookLayout();
  const { collapsed } = slots.sidebar?.useSidebar?.() ?? {};

  const isTopNav = nav?.mode === 'top';
  const main = 'minmax(0, var(--fd-docs-content-max, 90rem))';

  const layoutStyle = {
    /*
     * 6 列：inset | sidebar | 1fr | main | toc | 1fr
     * 后两个 1fr 把「正文+TOC」夹在中间居中。
     */
    gridTemplate: isTopNav
      ? `"header header header header header header"
"inset sidebar . toc-popover toc-popover ."
"inset sidebar . main toc ." 1fr / var(--fd-docs-inline-start, 0px) var(--fd-sidebar-col) minmax(0, 1fr) ${main} var(--fd-toc-width) minmax(0, 1fr)`
      : `"sidebar sidebar . header header ."
"sidebar sidebar . toc-popover toc-popover ."
"sidebar sidebar . main toc ." 1fr / var(--fd-docs-inline-start, 0px) var(--fd-sidebar-col) minmax(0, 1fr) ${main} var(--fd-toc-width) minmax(0, 1fr)`,
    '--fd-docs-row-1': 'var(--fd-banner-height, 0px)',
    '--fd-docs-row-2': 'calc(var(--fd-docs-row-1) + var(--fd-header-height))',
    '--fd-docs-row-3':
      'calc(var(--fd-docs-row-2) + var(--fd-toc-popover-height))',
    '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
    ...style,
  } as CSSProperties;

  return (
    <div
      id="nd-notebook-layout"
      data-sidebar-collapsed={collapsed}
      {...props}
      style={layoutStyle}
      className={cn(
        'grid min-h-(--fd-docs-height) auto-cols-auto auto-rows-auto overflow-x-clip [--fd-docs-height:100dvh] [--fd-header-height:0px] [--fd-toc-popover-height:0px] [--fd-sidebar-width:0px] [--fd-toc-width:0px] transition-[grid-template-columns] duration-280 ease-[cubic-bezier(0.32,0.72,0,1)]',
        /*
         * 收起时不加大 inset（否则 hover 热区跟着挪到正文左缘，极易误触）。
         * 只给正文加左内边距，避开左侧展开按钮。
         */
        collapsed && 'md:[&_#nd-page]:ps-14',
        className,
      )}
    >
      {children}
    </div>
  );
}
