import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { filterPageTreeForAccess } from '@/lib/docs/access/docs-page-tree-access';
import { source } from '@/lib/docs/source/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/ui/layout.shared';
import { DocsThemeToolbar } from '@/components/docs/theme-toolbar';
import { DocsSidebarTreeFolder, DocsSidebarTreeItem } from '@/components/docs/sidebar-tree';
import { AISearch, AISearchPanel } from '@/components/ai/search';
import { DocsFloatingAnchors } from '@/components/docs/floating-anchors';
import { DocSelectionProvider } from '@/components/docs/selection/selection-provider';
import { ExcerptCollectionProvider } from '@/components/docs/selection/excerpt-collection-context';
import { ExcerptCollectionDrawer } from '@/components/docs/selection/excerpt-collection-drawer';
import { ExcerptAiToolsBridge } from '@/components/docs/selection/excerpt-ai-tools-bridge';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const modelDisplayName = process.env.LLM_MODEL?.trim() || undefined;
  const access = await getDocAccessContextFromRequest();
  const tree = filterPageTreeForAccess(source.getPageTree(), access);

  return (
    <DocsLayout
      tree={tree}
      {...baseOptions()}
      slots={{
        themeSwitch: DocsThemeToolbar,
      }}
      sidebar={{
        /* 无 meta.json 时节点无 defaultOpen；用层级阈值让所有文件夹默认展开（与此前 meta 里 defaultOpen: true 一致） */
        defaultOpenLevel: 99,
        components: {
          Item: DocsSidebarTreeItem,
          Folder: DocsSidebarTreeFolder,
        },
      }}
    >
      <AISearch modelDisplayName={modelDisplayName}>
        <ExcerptCollectionProvider>
          <ExcerptAiToolsBridge />
          <AISearchPanel />
          <ExcerptCollectionDrawer />
          <DocsFloatingAnchors />
          <DocSelectionProvider />
          {children}
        </ExcerptCollectionProvider>
      </AISearch>
    </DocsLayout>
  );
}
