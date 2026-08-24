'use client';

import type { ComponentProps } from 'react';
import { NotebookLayoutContainer } from '@/components/docs/notebook-layout-container';
import { SidebarTreeSearchProvider } from '@/components/docs/sidebar-tree-search';
import { DocPeekProvider } from '@/components/docs/doc-peek-context';
import { DocsSmoothHashNav } from '@/components/docs/docs-smooth-hash';

/** Docs layout 的 notebook 容器：注入侧栏目录筛选与并排预览 Context */
export function DocsNotebookContainer(props: ComponentProps<'div'>) {
  return (
    <SidebarTreeSearchProvider>
      <DocPeekProvider>
        <DocsSmoothHashNav />
        <NotebookLayoutContainer {...props} />
      </DocPeekProvider>
    </SidebarTreeSearchProvider>
  );
}
