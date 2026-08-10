'use client';

import type { ComponentProps } from 'react';
import { NotebookLayoutContainer } from '@/components/docs/notebook-layout-container';
import { SidebarTreeSearchProvider } from '@/components/docs/sidebar-tree-search';

/** Docs layout 的 notebook 容器：注入侧栏目录筛选 Context */
export function DocsNotebookContainer(props: ComponentProps<'div'>) {
  return (
    <SidebarTreeSearchProvider>
      <NotebookLayoutContainer {...props} />
    </SidebarTreeSearchProvider>
  );
}
