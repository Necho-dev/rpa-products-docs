import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { filterPageTreeForAccess } from '@/lib/docs/access/docs-page-tree-access';
import { source } from '@/lib/docs/source/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/ui/layout.shared';
import { DocsThemeToolbar } from '@/components/docs/theme-toolbar';
import { DocsSidebarTreeFolder, DocsSidebarTreeItem } from '@/components/docs/sidebar-tree';
import type { Folder as PageTreeFolder } from 'fumadocs-core/page-tree';
import { jsx } from 'react/jsx-runtime';
import { AISearch, AISearchPanel } from '@/components/ai/search';
import { DocsFloatingAnchors } from '@/components/docs/floating-anchors';
import { DocSelectionProvider } from '@/components/docs/selection/selection-provider';
import { ExcerptCollectionProvider } from '@/components/docs/selection/excerpt-collection-context';
import { ExcerptCollectionDrawer } from '@/components/docs/selection/excerpt-collection-drawer';
import { ExcerptAiToolsBridge } from '@/components/docs/selection/excerpt-ai-tools-bridge';
import { DocFeedbackProvider } from '@/components/docs/feedback/doc-feedback-context';
import { isDocFeedbackEnabled } from '@/lib/docs/feedback/config';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const modelDisplayName = process.env.LLM_MODEL?.trim() || undefined;
  const access = await getDocAccessContextFromRequest();
  const tree = filterPageTreeForAccess(source.getPageTree(), access);
  const feedbackEnabled = isDocFeedbackEnabled();

  return (
    <DocsLayout
      tree={tree}
      tabMode="auto"
      {...baseOptions()}
      slots={{
        themeSwitch: DocsThemeToolbar,
      }}
      sidebar={{
        tabs: {
          transform: (option, node: PageTreeFolder) => ({
            ...option,
            // 与 defaultTransform 保持一致的包裹 div，让 SVG 尺寸受容器约束
            icon: node.icon
              ? jsx('div', {
                  className:
                    'size-full [&_svg]:size-full max-md:p-1.5 max-md:rounded-md max-md:border max-md:bg-fd-secondary',
                  children: node.icon,
                })
              : undefined,
          }),
        },
        /* 无 meta.json 时节点无 defaultOpen; 用层级常量让所有文件夹默认展开;与此前 meta 里 defaultOpen: true 一致 */
        defaultOpenLevel: 99,
        components: {
          Item: DocsSidebarTreeItem,
          Folder: DocsSidebarTreeFolder,
        },
      }}
    >
      <AISearch modelDisplayName={modelDisplayName}>
        <DocFeedbackProvider enabled={feedbackEnabled}>
          <ExcerptCollectionProvider>
            <ExcerptAiToolsBridge />
            <AISearchPanel />
            <ExcerptCollectionDrawer />
            <DocsFloatingAnchors />
            <DocSelectionProvider />
            {children}
          </ExcerptCollectionProvider>
        </DocFeedbackProvider>
      </AISearch>
    </DocsLayout>
  );
}
