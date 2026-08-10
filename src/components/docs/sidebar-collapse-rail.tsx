'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Sidebar as SidebarIcon } from 'lucide-react';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { cn } from '@/lib/core/cn';

function subscribeSidebarEl(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}

function getSidebarEl() {
  return document.querySelector<HTMLElement>('#nd-sidebar');
}

/**
 * 收起/展开按钮：
 * - 展开：挂在侧栏右缘（分割线位置）
 * - 收起：固定停在左侧；hover 滑出侧栏时也不挪动，保证始终可点
 */
export function SidebarCollapseRail() {
  const { slots } = useNotebookLayout();
  const sidebar = slots.sidebar;
  const { collapsed } = sidebar?.useSidebar() ?? { collapsed: false };
  const sidebarEl = useSyncExternalStore(
    subscribeSidebarEl,
    getSidebarEl,
    () => null,
  );

  if (!sidebar) return null;

  const CollapseTrigger = sidebar.collapseTrigger;
  const icon = <SidebarIcon className="size-4.5" />;

  const sharedClass = cn(
    'max-md:hidden',
    'flex size-9 items-center justify-center rounded-full',
    'h-9! w-9! shrink-0',
    'border border-fd-border bg-fd-background text-fd-muted-foreground',
    'shadow-[0_0_0_3px_var(--color-fd-background)]',
    'transition-[box-shadow,colors] duration-200',
    'hover:bg-fd-muted hover:text-fd-accent-foreground',
    'hover:shadow-[0_0_0_3px_var(--color-fd-background),0_2px_8px_rgba(15,23,42,0.08)]',
  );

  /* 收起：始终停在左侧（含 hover peek） */
  if (collapsed) {
    return (
      <CollapseTrigger
        data-sidebar-collapse-rail=""
        data-collapsed="true"
        aria-label="展开侧边栏"
        className={cn(
          sharedClass,
          'fixed left-5 z-40 shadow-md',
          'top-[calc(var(--fd-docs-row-2)+2.25rem)]',
        )}
      >
        {icon}
      </CollapseTrigger>
    );
  }

  /* 展开：压在侧栏右缘分割线 */
  if (!sidebarEl) return null;

  return createPortal(
    <CollapseTrigger
      data-sidebar-collapse-rail=""
      data-collapsed="false"
      aria-label="收起侧边栏"
      className={cn(
        sharedClass,
        'absolute top-12 inset-e-0 z-30 translate-x-1/2',
      )}
    >
      {icon}
    </CollapseTrigger>,
    sidebarEl,
  );
}
