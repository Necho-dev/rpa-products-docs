/**
 * 嵌入通道文档页（/embed/docs/[[...slug]]）
 *
 * 仅由 proxy.ts applyEmbedGate (X-Render-Mode: html) rewrite 调用，
 * 外部直访被 blockEmbedInternalRoutes 拦截返回 404。
 *
 * 与 /docs/[[...slug]]/page.tsx 的区别：
 * - 鉴权失败渲染 401 提示（不 redirect，嵌入场景不应 302 到登录页）
 * - 不依赖 DocsLayout/DocsPage context（极简布局）
 * - 不显示工具栏（分享、Markdown 复制、MCP、ViewOptions）
 * - 完整 MDX 渲染：page.data.body + getMDXComponents（与文档站一致）
 */
import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { source } from '@/lib/docs/source/source';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/docs/mdx';
import { ConnectorSchedulePanel } from '@/components/docs/connector-schedule-panel';
import { hasScheduleMeta } from '@/lib/docs/format-schedule-meta';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export const dynamic = 'force-dynamic';

export default async function EmbedDocPage(props: PageProps<'/embed/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const access = await getDocAccessContextFromRequest();
  if (!isDocPageAccessible(page, access)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-4xl font-semibold text-fd-muted-foreground">401</p>
        <p className="text-fd-muted-foreground">无访问权限，请通过嵌入鉴权通道访问</p>
      </div>
    );
  }

  const MDX = page.data.body;

  const scheduleMeta = {
    entry: page.data.entry,
    dataReady: page.data.dataReady,
    estimatedDuration: page.data.estimatedDuration,
    minInterval: page.data.minInterval,
  };
  const showSchedulePanel = hasScheduleMeta(scheduleMeta);

  return (
    // id="nd-docs-layout" 让 docs-prose-override.css 的选择器（blockquote、table 等）生效，与主站渲染一致
    <div id="nd-docs-layout">
      <article className="prose max-w-none px-4 py-6 md:px-6 md:py-8">
        <h1>{page.data.title}</h1>
        {showSchedulePanel ? (
          <div className="not-prose mb-3">
            <ConnectorSchedulePanel
              dataReady={scheduleMeta.dataReady}
              estimatedDuration={scheduleMeta.estimatedDuration}
              minInterval={scheduleMeta.minInterval}
            />
          </div>
        ) : null}
        {page.data.description ? (
          <p className="lead text-fd-muted-foreground">{page.data.description}</p>
        ) : null}
        {Array.isArray(page.data.tags) && page.data.tags.length > 0 ? (
          <div className="not-prose flex flex-wrap gap-1.5 pt-1">
            {page.data.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-muted/50 px-2 py-0.5 text-xs font-medium text-fd-muted-foreground"
              >
                <span className="text-fd-primary/60 select-none">#</span>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </article>
    </div>
  );
}
