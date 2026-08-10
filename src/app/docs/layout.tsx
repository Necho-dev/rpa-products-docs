import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { filterPageTreeForAccess } from '@/lib/docs/access/docs-page-tree-access';
import { source } from '@/lib/docs/source/source';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { baseOptions } from '@/lib/ui/layout.shared';
import { DocsThemeToolbar } from '@/components/docs/theme-toolbar';
import { DocsNotebookContainer } from '@/components/docs/docs-notebook-container';
import { SidebarCollapseRail } from '@/components/docs/sidebar-collapse-rail';
import { DocsSidebarTreeFolder, DocsSidebarTreeItem } from '@/components/docs/sidebar-tree';
import { SidebarTreeSearchBanner } from '@/components/docs/sidebar-tree-search';
import type { Folder as PageTreeFolder } from 'fumadocs-core/page-tree';
import { jsx, jsxs } from 'react/jsx-runtime';
import { HomeIcon } from 'lucide-react';
import { AISearch, AISearchPanel } from '@/components/ai/search';
import { DocsFloatingAnchors } from '@/components/docs/floating-anchors';
import { DocSelectionProvider } from '@/components/docs/selection/selection-provider';
import { ExcerptCollectionProvider } from '@/components/docs/selection/excerpt-collection-context';
import { ExcerptCollectionDrawer } from '@/components/docs/selection/excerpt-collection-drawer';
import { ExcerptAiToolsBridge } from '@/components/docs/selection/excerpt-ai-tools-bridge';
import { DocFeedbackProvider } from '@/components/docs/feedback/doc-feedback-context';
import { isDocFeedbackEnabled } from '@/lib/docs/feedback/config';
import { AppUpdateSentinel } from '@/components/observability/app-update-sentinel';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const modelDisplayName = process.env.LLM_MODEL?.trim() || undefined;
  const access = await getDocAccessContextFromRequest();
  const tree = filterPageTreeForAccess(source.getPageTree(), access);
  const feedbackEnabled = isDocFeedbackEnabled();
  const { nav, ...base } = baseOptions();

  const partitionTabs = getLayoutTabs(tree, {
    transform: (option, node: PageTreeFolder) => ({
      ...option,
      // 顶栏 / 移动端下拉共用 icon
      icon: node.icon
        ? jsx('div', {
            className: 'size-full [&_svg]:size-full',
            children: node.icon,
          })
        : undefined,
      // LayoutHeaderTabs 默认只渲染 title，把 icon 拼进 title
      title: jsxs('span', {
        className: 'inline-flex items-center gap-1.5',
        children: [
          node.icon
            ? jsx('span', {
                className: 'size-3.5 shrink-0 [&_svg]:size-full',
                'aria-hidden': true,
                children: node.icon,
              })
            : null,
          option.title,
        ],
      }),
    }),
  });

  return (
    <DocsLayout
      {...base}
      tree={tree}
      tabMode="navbar"
      nav={{
        ...nav,
        mode: 'top',
      }}
      tabs={[
        {
          url: '/',
          title: jsxs('span', {
            className: 'inline-flex items-center gap-1.5',
            children: [
              jsx(HomeIcon, {
                className: 'size-3.5 shrink-0',
                'aria-hidden': true,
              }),
              '首页',
            ],
          }),
          // 仅在首页高亮；文档区内不高亮
          urls: new Set(['/']),
        },
        ...partitionTabs,
      ]}
      slots={{
        container: DocsNotebookContainer,
        themeSwitch: DocsThemeToolbar,
      }}
      sidebar={{
        /* 无 meta.json 时节点无 defaultOpen; 用层级常量让所有文件夹默认展开 */
        defaultOpenLevel: 99,
        banner: SidebarTreeSearchBanner,
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
            <SidebarCollapseRail />
            <DocsFloatingAnchors />
            <DocSelectionProvider />
            <AppUpdateSentinel />
            {children}
          </ExcerptCollectionProvider>
        </DocFeedbackProvider>
      </AISearch>
    </DocsLayout>
  );
}
