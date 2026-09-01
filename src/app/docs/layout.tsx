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
import { CategoryNavProvider } from '@/components/docs/category-nav-context';
import { DocsHeader } from '@/components/docs/docs-header';
import { CategoryNavTabMenu } from '@/components/docs/category-nav-tab-menu';
import { listCategoryNavModels } from '@/lib/docs/source/category-nav-fs';
import { normalizeDocsPath } from '@/lib/docs/source/category-nav';
import type { Folder as PageTreeFolder } from 'fumadocs-core/page-tree';
import { jsx, jsxs } from 'react/jsx-runtime';
import { cloneElement, isValidElement, Suspense, type ReactElement, type ReactNode } from 'react';
import { HomeIcon } from 'lucide-react';
import { AISearch, AISearchPanel } from '@/components/ai/search';
import { DocsFloatingAnchors } from '@/components/docs/floating-anchors';
import { DocSelectionProvider } from '@/components/docs/selection/selection-provider';
import { ExcerptCollectionProvider } from '@/components/docs/selection/excerpt-collection-context';
import { ExcerptCollectionDrawer } from '@/components/docs/selection/excerpt-collection-drawer';
import { ExcerptAiToolsBridge } from '@/components/docs/selection/excerpt-ai-tools-bridge';
import { OpenDocAiToolsBridge } from '@/components/docs/open-doc-ai-tools-bridge';
import { DocFeedbackProvider } from '@/components/docs/feedback/doc-feedback-context';
import { isDocFeedbackEnabled } from '@/lib/docs/feedback/config';
import { AppUpdateSentinel } from '@/components/observability/app-update-sentinel';
import { getLlmModelDisplayName } from '@/lib/ai/llm';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const modelDisplayName = getLlmModelDisplayName();
  const access = await getDocAccessContextFromRequest();
  const tree = filterPageTreeForAccess(source.getPageTree(), access);
  const categoryNavModels = listCategoryNavModels();
  const feedbackEnabled = isDocFeedbackEnabled();
  const { nav, ...base } = baseOptions();

  /**
   * 顶栏 LayoutHeaderTabs 只渲染 title，需把 icon 内嵌进 title。
   * 小屏 SidebarTabsDropdown 另有独立 icon 槽 —— 内嵌节点标 data-tab-inline-icon，
   * 由 CSS 在侧栏下拉里隐藏，避免双图标。
   * icon 会同时出现在顶栏与侧栏 DOM 中，须 clone，避免同一 element 实例挂载两处。
   */
  const cloneTabIcon = (icon: ReactNode): ReactNode => {
    if (!isValidElement(icon)) return icon;
    return cloneElement(icon as ReactElement);
  };

  const withTabTitleIcon = (title: ReactNode, icon?: ReactNode) =>
    icon
      ? jsxs('span', {
          className: 'inline-flex items-center gap-1.5',
          children: [
            jsx('span', {
              'data-tab-inline-icon': '',
              className: 'size-4 shrink-0 [&_img]:size-full [&_svg]:size-full',
              'aria-hidden': true,
              children: cloneTabIcon(icon),
            }),
            title,
          ],
        })
      : title;

  const tabIconSlot = (icon: ReactNode) =>
    jsx('div', {
      className: 'size-full [&_svg]:size-full',
      children: cloneTabIcon(icon),
    });

  const partitionTabs = getLayoutTabs(tree, {
    transform: (option, node: PageTreeFolder) => {
      const prefix = normalizeDocsPath(option.url);
      const navModel =
        categoryNavModels.find((m) => m.prefix === prefix) ?? null;
      return {
        ...option,
        icon: node.icon ? tabIconSlot(node.icon) : undefined,
        title: withTabTitleIcon(
          jsx(CategoryNavTabMenu, {
            label: option.title,
            model: navModel,
          }),
          node.icon,
        ),
      };
    },
  });

  return (
    <Suspense>
    <CategoryNavProvider models={categoryNavModels}>
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
          icon: tabIconSlot(
            jsx(HomeIcon, {
              className: 'size-full',
              'aria-hidden': true,
            }),
          ),
          title: withTabTitleIcon(
            '首页',
            jsx(HomeIcon, {
              className: 'size-full',
              'aria-hidden': true,
            }),
          ),
          // 仅在首页高亮；文档区内不高亮
          urls: new Set(['/']),
        },
        ...partitionTabs,
      ]}
      slots={{
        container: DocsNotebookContainer,
        themeSwitch: DocsThemeToolbar,
        header: DocsHeader,
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
            <OpenDocAiToolsBridge />
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
    </CategoryNavProvider>
    </Suspense>
  );
}
