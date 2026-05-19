import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { filterPageTreeForAccess } from '@/lib/docs/access/docs-page-tree-access';
import { source } from '@/lib/docs/source/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/ui/layout.shared';
import { DocsThemeToolbar } from '@/components/docs/theme-toolbar';
import { DocsSidebarTreeFolder, DocsSidebarTreeItem } from '@/components/docs/sidebar-tree';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';
import { SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

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
        <AISearchPanel />
        <AISearchTrigger
          position="float"
          title="快捷键：⌘ I 或 Ctrl + I 打开 / 关闭"
          className={cn(
            buttonVariants({
              variant: 'secondary',
              className: 'group text-fd-muted-foreground rounded-2xl gap-1.5',
            }),
          )}
        >
          <SparklesIcon className="size-3.5 transition-[transform] duration-300 group-hover:rotate-12 group-hover:scale-110" />
          <span className="whitespace-nowrap">Ask AI</span>
        </AISearchTrigger>
        {children}
      </AISearch>
    </DocsLayout>
  );
}
