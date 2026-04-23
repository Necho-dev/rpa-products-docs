import React from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { cn } from '@/lib/cn';
import { getLanguageIdFromPreProps, getLanguageLabel } from '@/lib/code-block-language';
import { Mermaid } from '@/components/mdx/mermaid';
import { SearchOpenCard } from '@/components/mdx/search-open-card';
import { AIChatOpenCard } from '@/components/ai/search';
import { ModuleCard } from '@/components/mdx/module-card';
import { ConnectorMeta } from '@/components/mdx/connector-meta';

const codeBlockChromeClassName =
  'rounded-lg border-fd-border/70 shadow-none ring-1 ring-fd-border/25 dark:ring-fd-border/40';

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
    img: ({ className, ...props }: React.ComponentProps<'img'>) => {
      const isFirst = mdxInlineImageIndex++ === 0;
      return (
        <ImageZoom
          {...(props as any)}
          quality={95}
          priority={isFirst}
          // 与加宽后的 #nd-docs-layout 主栏一致：过小的 sizes 会让浏览器选低分辨率
          // next/image 变体，实际展示宽度常 >900px 时被放大发糊；放大预览因 high-quality+原图而清晰
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, min(72vw, 1600px)"
          className={cn(
            'rounded-xl shadow-md shadow-black/10 dark:shadow-black/30 border border-fd-border/30 [image-rendering:high-quality]',
            className,
          )}
        />
      );
    },
    pre: ({ ref: _ref, title: metaTitle, children, className, ...rest }) => {
      const langId = getLanguageIdFromPreProps(className, children);
      const langLabel = getLanguageLabel(langId);
      return (
        <CodeBlock
          {...rest}
          title={
            <CodeBlockTitle metaTitle={typeof metaTitle === 'string' ? metaTitle : undefined} langLabel={langLabel} /> as unknown as string
          }
          className={cn(codeBlockChromeClassName, className)}
        >
          <Pre>{children}</Pre>
        </CodeBlock>
      );
    },
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
