import React from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { cn } from '@/lib/cn';
import { getLanguageIdFromPreProps, getLanguageLabel } from '@/lib/code-block-language';
import { Mermaid } from '@/components/mdx/mermaid';
import { SearchOpenCard } from '@/components/mdx/search-open-card';
import { AIChatOpenCard } from '@/components/ai/search';
import { ModuleCard } from '@/components/mdx/module-card';
import { ConnectorMeta } from '@/components/mdx/connector-meta';
import { TableWithExport } from '@/components/mdx/table-export';
import { CodeBlockWithDownload } from '@/components/mdx/code-block-with-download';

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

function CodeBlockTitle({
  metaTitle,
  langLabel,
}: {
  metaTitle?: string;
  langLabel: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {metaTitle ? <span className="truncate font-medium text-fd-foreground">{metaTitle}</span> : null}
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
    Mermaid,
    SearchOpenCard,
    AIChatOpenCard,
    ModuleCard,
    ConnectorMeta,
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
    pre: ({ ref: _ref, title: metaTitle, children, className, ...rest }) => {
      const langId = getLanguageIdFromPreProps(className, children) ?? '';
      const langLabel = getLanguageLabel(langId);
      const codeText = extractText(children).trimEnd();
      return (
        <CodeBlockWithDownload
          {...rest}
          code={codeText}
          lang={langId}
          title={
            <CodeBlockTitle metaTitle={typeof metaTitle === 'string' ? metaTitle : undefined} langLabel={langLabel} />
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
