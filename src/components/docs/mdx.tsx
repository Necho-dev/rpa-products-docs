import React from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { cn } from '@/lib/core/cn';
import { getLanguageIdFromPreProps, getLanguageLabel } from '@/lib/ui/code-block-language';
import { AIChatOpenCard } from '@/components/ai/search';
import { CodeBlockWithDownload } from '@/components/docs/mdx/code-block-with-download';
import { MetaPanel } from '@/components/docs/mdx/meta-panel';
import { ModuleGrid } from '@/components/docs/mdx/module-grid';
import { JsonSchema } from '@/components/docs/mdx/json-schema';
import { Mermaid } from '@/components/docs/mdx/mermaid';
import { ModuleCard } from '@/components/docs/mdx/module-card';
import { SearchOpenCard } from '@/components/docs/mdx/search-open-card';
import { FieldTreeTable } from '@/components/docs/mdx/field-tree-table';
import { TableWithExport } from '@/components/docs/mdx/table-export';
import { DocsLink } from '@/components/docs/docs-link';

/** Recursively extract plain text from React node tree (handles shiki span nesting) */
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in (node as object)) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props?.children);
  }
  return '';
}

/** Shiki transformerIcon 注入的 SVG HTML 或 React 节点 */
function CodeBlockLangIcon({ icon }: { icon?: React.ReactNode }) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return (
      <span
        className="shrink-0 text-fd-muted-foreground [&_svg]:size-3.5"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }
  return <span className="shrink-0 text-fd-muted-foreground [&_svg]:size-3.5">{icon}</span>;
}

function CodeBlockTitle({
  metaTitle,
  langLabel,
  icon,
}: {
  metaTitle?: string;
  langLabel: string;
  icon?: React.ReactNode;
}) {
  if (metaTitle) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <CodeBlockLangIcon icon={icon} />
        <span className="truncate font-medium text-fd-foreground">{metaTitle}</span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <CodeBlockLangIcon icon={icon} />
      <span className="shrink-0 rounded-md border border-fd-border/80 bg-fd-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-fd-muted-foreground">
        {langLabel}
      </span>
    </span>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  /** 页面 MDX 渲染内递增: 对首张内嵌图设 priority 避免 LCP 警告 */
  let mdxInlineImageIndex = 0;

  return {
    ...defaultMdxComponents,
    a: DocsLink,
    ...TabsComponents,
    Files,
    Folder,
    File,
    Mermaid,
    JsonSchema,
    SearchOpenCard,
    AIChatOpenCard,
    ModuleCard,
    MetaPanel,
    ModuleGrid,
    FieldTreeTable,
    table: TableWithExport,
    img: ({ className, ...props }: React.ComponentProps<'img'>) => {
      const isFirst = mdxInlineImageIndex++ === 0;
      return (
        <ImageZoom
          {...(props as any)}
          quality={95}
          priority={isFirst}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, min(72vw, 1600px)"
          className={cn(
            'rounded-xl shadow-md shadow-black/10 dark:shadow-black/30 border border-fd-border/30 [image-rendering:high-quality]',
            className,
          )}
        />
      );
    },
    pre: (props) => {
      const { ref: _ref, title: metaTitle, icon, children, className, ...rest } = props as React.ComponentProps<'pre'> & {
        icon?: React.ReactNode;
      };
      const langId = getLanguageIdFromPreProps(className, children) ?? '';
      const langLabel = getLanguageLabel(langId);
      const codeText = extractText(children).trimEnd();

      // `data-collapsed` is injected by parseMetaString in source.config.ts
      // when the code fence meta contains the `collapsed` keyword.
      const defaultCollapsed = (rest as Record<string, unknown>)['data-collapsed'] === true;

      return (
        <CodeBlockWithDownload
          {...rest}
          code={codeText}
          lang={langId}
          defaultCollapsed={defaultCollapsed}
          title={
            <CodeBlockTitle
              metaTitle={typeof metaTitle === 'string' ? metaTitle : undefined}
              langLabel={langLabel}
              icon={icon}
            />
          }
          className={className}
        >
          {children}
        </CodeBlockWithDownload>
      );
    },
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
