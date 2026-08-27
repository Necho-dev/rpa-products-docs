import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { DocShareButton } from '@/components/docs/doc-share-dialog';
import { getPageImage, getPageMarkdownUrl, getPageSharePoster, source } from '@/lib/docs/source/source';
import { resolveCategoryFilterStackToc } from '@/lib/docs/source/collect-descendant-modules';
import type { TOCItemType } from 'fumadocs-core/toc';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  PageLastUpdate,
} from 'fumadocs-ui/layouts/notebook/page';
import { DocsBreadcrumb } from '@/components/docs/docs-breadcrumb';
import { MarkdownActionsButton } from '@/components/docs/markdown-copy-button';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/components/docs/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { DocsLink } from '@/components/docs/docs-link';
import { getSiteDescription, siteName } from '@/lib/core/shared';
import { AddMcpButton } from '@/components/docs/add-mcp-button';
import { ConnectorSchedulePanel } from '@/components/docs/connector-schedule-panel';
import { cookies, headers } from 'next/headers';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { DOC_PEEK_COOKIE, parsePeekTarget, shouldRenderPeekFromCookie } from '@/lib/docs/doc-peek';
import { DocSplitShell } from '@/components/docs/doc-split-shell';
import { PeekArticle, peekArticleTitle } from '@/components/docs/peek-article';
import { DocPeekSeed } from '@/components/docs/doc-peek-seed';
import { DocAppendix } from '@/components/docs/doc-appendix';
import { appendixTocItems } from '@/lib/docs/doc-appendix';
import { getPageBacklinks } from '@/lib/docs/doc-references';
import { collectScheduleAnnotations, hasScheduleMeta } from '@/lib/docs/format-schedule-meta';

/** 路由段配置须为静态字面量；按请求做私有文档鉴权也需动态渲染 */
export const dynamic = 'force-dynamic';

/**
 * 正文列宽由 NotebookLayoutContainer 的 --fd-docs-content-max 控制；
 * *:max-w-none 清掉 Notebook 默认 900px，内容吃满 main 列，右侧 TOC 紧贴跟随。
 * min-h 对齐文档布局视口高度，配合 DocsBody 的 flex-1，把「最后更新」顶到页面底部。
 */
const docsPageArticleClassName =
  'flex max-w-none w-full *:max-w-none min-h-[calc(var(--fd-docs-height,100dvh)-var(--fd-docs-row-3,0px))] flex-col gap-4 px-4 py-6 md:px-5 md:pt-8 xl:px-6 xl:pt-10 xl:layout:[--fd-toc-width:12.5rem]';

function dedupeTocByUrl(items: TOCItemType[]): TOCItemType[] {
  const seen = new Set<string>();
  const out: TOCItemType[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  return out;
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const access = await getDocAccessContextFromRequest();
  if (!isDocPageAccessible(page, access)) {
    if (isCubeSsoEnabled()) {
      redirect(`/auth/login?redirect=${encodeURIComponent(page.url)}`);
    }
    redirect(`/docs/access?next=${encodeURIComponent(page.url)}`);
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  const hdrs = await headers();
  const origin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, { headers: Object.fromEntries(hdrs.entries()) }),
  );
  const mcpUrl = `${origin}/mcp`;

  const lastModified = page.data.lastModified;
  const backlinks = getPageBacklinks(page, access);
  const stackToc = [...(await resolveCategoryFilterStackToc(page.slugs, access))];
  const scheduleMeta = {
    entry: page.data.entry,
    dataReady: page.data.dataReady,
    estimatedDuration: page.data.estimatedDuration,
    minInterval: page.data.minInterval,
  };
  const showSchedulePanel = hasScheduleMeta(scheduleMeta);
  const annotations = collectScheduleAnnotations(scheduleMeta);
  const appendixToc = appendixTocItems({
    citedBy: backlinks.length,
    annotations: annotations.length,
  });
  const toc = dedupeTocByUrl([
    ...(page.data.toc ?? []),
    ...stackToc,
    ...appendixToc,
  ]);
  const cookieStore = await cookies();
  const searchParams = await props.searchParams;
  const peekFromQuery = parsePeekTarget(searchParams.peek);
  const peekCookie = shouldRenderPeekFromCookie(hdrs)
    ? parsePeekTarget(cookieStore.get(DOC_PEEK_COOKIE)?.value)
    : null;
  const peekTarget = peekFromQuery ?? peekCookie;

  return (
    <>
    <DocsPage
      toc={toc}
      full={page.data.full}
      className={docsPageArticleClassName}
      breadcrumb={{ enabled: true }}
      slots={{ breadcrumb: DocsBreadcrumb }}
    >
      <div className="flex flex-col gap-1.5">
        <DocsTitle className="mb-0">{page.data.title}</DocsTitle>
        {showSchedulePanel ? (
          <ConnectorSchedulePanel
            dataReady={scheduleMeta.dataReady}
            estimatedDuration={scheduleMeta.estimatedDuration}
            minInterval={scheduleMeta.minInterval}
          />
        ) : null}
        <DocsDescription className="mb-0 text-base">{page.data.description}</DocsDescription>
        {Array.isArray(page.data.tags) && page.data.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
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
      </div>
      <div className="flex flex-row flex-wrap gap-2 items-center border-b pb-6" data-no-select>
        <MarkdownActionsButton markdownUrl={markdownUrl} />
        <AddMcpButton mcpUrl={mcpUrl} />
        <DocShareButton
          title={page.data.title}
          description={page.data.description}
          pageUrl={`${origin}${page.url}`}
          posterUrl={`${origin}${getPageSharePoster(page).url}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page, DocsLink),
          })}
        />
      </DocsBody>
      <DocAppendix referrers={backlinks} annotations={annotations} />
      {lastModified ? (
        <PageLastUpdate date={lastModified} className="mt-auto pt-6" />
      ) : null}
    </DocsPage>
    <DocPeekSeed target={peekFromQuery} />
    {peekTarget ? (
      <DocSplitShell title={peekArticleTitle(peekTarget.path)}>
        <PeekArticle path={peekTarget.path} access={access} />
      </DocSplitShell>
    ) : (
      <DocSplitShell title="文档预览">{null}</DocSplitShell>
    )}
    </>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const access = await getDocAccessContextFromRequest();
  if (!isDocPageAccessible(page, access)) {
    return {
      title: '需要访问权限',
      robots: { index: false, follow: false },
    };
  }

  const title = page.data.title?.trim() || siteName;
  const description = page.data.description?.trim() || getSiteDescription();

  const hdrs = await headers();
  const origin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, { headers: Object.fromEntries(hdrs.entries()) }),
  );

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: `${origin}${getPageImage(page).url}`,
    },
  };
}
