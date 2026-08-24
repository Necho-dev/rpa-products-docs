'use client';

import { useEffect, useLayoutEffect, type ComponentProps, type CSSProperties } from 'react';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { cn } from '@/lib/core/cn';
import { useDocPeek } from '@/components/docs/doc-peek-context';

/**
 * 文档区网格布局：
 * - 顶栏全宽
 * - 侧栏靠左（左侧仅一点点留白）
 * - 正文 + TOC 在侧栏右侧剩余空间内整体居中（两侧 1fr 等分）
 * - 并排 peek 时：左栏（正文+本页目录）紧贴右栏，仅 1px 分隔线
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
  const peek = useDocPeek();
  const peekOpen = Boolean(peek?.open);
  const leftFr = peekOpen ? Math.max(0.28, peek?.peekRatio ?? 0.5) : 1;
  const rightFr = peekOpen ? Math.max(0.28, 1 - (peek?.peekRatio ?? 0.5)) : 1;

  const isTopNav = nav?.mode === 'top';
  const main = 'minmax(0, var(--fd-docs-content-max, 90rem))';
  const peekMain = 'minmax(0, var(--fd-peek-left-fr))';
  const peekPane = 'minmax(0, var(--fd-peek-right-fr))';

  useLayoutEffect(() => {
    const el = document.getElementById('nd-notebook-layout');
    if (!el || !peekOpen || peek?.splitDragging) return;
    el.style.setProperty('--fd-peek-left-fr', `${leftFr}fr`);
    el.style.setProperty('--fd-peek-right-fr', `${rightFr}fr`);
  }, [peekOpen, leftFr, rightFr, peek?.splitDragging]);

  useEffect(() => {
    if (!peekOpen) return;
    const toc = document.getElementById('nd-toc');
    const page = document.getElementById('nd-page');
    if (!toc || !page) return;

    const overflowingScroller = (root: HTMLElement) => {
      const nodes = [root, ...root.querySelectorAll<HTMLElement>('*')];
      for (let i = nodes.length - 1; i >= 0; i--) {
        const el = nodes[i];
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
          return el;
        }
      }
      return null;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const scroller = overflowingScroller(toc);
      if (scroller) {
        const atTop = scroller.scrollTop <= 0 && e.deltaY < 0;
        const atBottom =
          scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && e.deltaY > 0;
        if (!atTop && !atBottom) return;
      }
      e.preventDefault();
      page.scrollTop += e.deltaY;
    };

    toc.addEventListener('wheel', onWheel, { passive: false });
    return () => toc.removeEventListener('wheel', onWheel);
  }, [peekOpen]);

  const layoutStyle = {
    gridTemplate: peekOpen
      ? isTopNav
        ? `"header header header header header"
"inset sidebar . toc-popover peek"
"inset sidebar . main peek" minmax(0, 1fr) / var(--fd-docs-inline-start, 0px) var(--fd-sidebar-col) 0px ${peekMain} ${peekPane}`
        : `"sidebar sidebar . header peek"
"sidebar sidebar . toc-popover peek"
"sidebar sidebar . main peek" minmax(0, 1fr) / var(--fd-docs-inline-start, 0px) var(--fd-sidebar-col) 0px ${peekMain} ${peekPane}`
      : isTopNav
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
    '--fd-toc-width': peekOpen ? '12.5rem' : undefined,
    ...style,
  } as CSSProperties;

  return (
    <div
      id="nd-notebook-layout"
      data-sidebar-collapsed={collapsed}
      data-doc-peek-open={peekOpen || undefined}
      data-peek-dragging={peek?.splitDragging || undefined}
      {...props}
      style={layoutStyle}
      className={cn(
        'grid min-h-(--fd-docs-height) auto-cols-auto auto-rows-auto overflow-x-clip [--fd-docs-height:100dvh] [--fd-header-height:0px] [--fd-toc-popover-height:0px] [--fd-sidebar-width:0px] [--fd-toc-width:0px] [--fd-peek-left-fr:0.5fr] [--fd-peek-right-fr:0.5fr] transition-[grid-template-columns] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] data-peek-dragging:duration-0 data-peek-dragging:ease-linear data-peek-dragging:transition-none',
        collapsed && 'md:[&_#nd-page]:ps-14',
        peekOpen &&
          'h-(--fd-docs-height) max-h-(--fd-docs-height) w-screen max-w-[100vw] overflow-hidden [&_#nd-page]:min-h-0! [&_#nd-page]:max-h-full [&_#nd-page]:overflow-y-auto [&_#nd-page]:overscroll-contain [&_#nd-page]:pe-(--fd-toc-width) max-xl:[&_#nd-page]:pe-0 [&_#nd-toc]:[grid-area:main] [&_#nd-toc]:z-5 [&_#nd-toc]:justify-self-end [&_#nd-toc]:min-h-0 [&_#nd-toc]:max-h-full [&_#nd-toc]:overflow-hidden [&_#nd-toc>div]:min-h-0 [&_#nd-toc>div]:flex-1 **:data-toc-popover:hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}
