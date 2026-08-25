import Link from 'next/link';
import { DocsBody, PageLastUpdate } from 'fumadocs-ui/layouts/notebook/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { TOCItemType } from 'fumadocs-core/toc';
import { PeekToc } from '@/components/docs/peek-toc';
import { PeekHeadingScope } from '@/components/docs/peek-heading-scope';
import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { getMDXComponents } from '@/components/docs/mdx';
import { DocsLink } from '@/components/docs/docs-link';
import { DocsBreadcrumb } from '@/components/docs/docs-breadcrumb';
import { MarkdownActionsButton } from '@/components/docs/markdown-copy-button';
import { AddMcpButton } from '@/components/docs/add-mcp-button';
import { DocShareButton } from '@/components/docs/doc-share-dialog';
import { ConnectorSchedulePanel } from '@/components/docs/connector-schedule-panel';
import { collectScheduleAnnotations, hasScheduleMeta } from '@/lib/docs/format-schedule-meta';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { getPageMarkdownUrl, getPageSharePoster, source } from '@/lib/docs/source/source';
import { docsRoute } from '@/lib/core/shared';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { headers } from 'next/headers';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { ReferencesOutbound } from '@/components/docs/references/references-outbound';
import { DocAppendix } from '@/components/docs/doc-appendix';
import { appendixTocItems } from '@/lib/docs/doc-appendix';
import { getPageBacklinks } from '@/lib/docs/doc-references';

function PeekArticleDenied({ path }: { path: string }) {
  const next = path.startsWith('/') ? path : `${docsRoute}/${path}`;
  const href = isCubeSsoEnabled()
    ? `/auth/login?redirect=${encodeURIComponent(next)}`
    : `/docs/access?next=${encodeURIComponent(next)}`;
  const label = isCubeSsoEnabled() ? '去登录' : '去验证访问令牌';

  return (
    <div data-doc-peek="true" data-doc-path={path} className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-sm text-fd-muted-foreground">当前文档需要访问权限，未在右栏展开正文。</p>
      <Link href={href} className="text-sm text-fd-primary hover:underline">
        {label}
      </Link>
    </div>
  );
}

export function PeekArticleMissing() {
  return (
    <div data-doc-peek="true" className="px-6 py-16 text-center text-sm text-fd-muted-foreground">
      未找到对应文档。
    </div>
  );
}

export async function PeekArticle({
  path,
  access,
}: {
  path: string;
  access: DocAccessContext;
}) {
  const slugs =
    path === docsRoute ? [] : path.slice(docsRoute.length + 1).split('/').filter(Boolean);
  const page = source.getPage(slugs.length ? slugs : undefined);
  if (!page) return <PeekArticleMissing />;
  if (!isDocPageAccessible(page, access)) {
    return <PeekArticleDenied path={page.url} />;
  }

  const MDX = page.data.body;
  const scheduleMeta = {
    entry: page.data.entry,
    dataReady: page.data.dataReady,
    estimatedDuration: page.data.estimatedDuration,
    minInterval: page.data.minInterval,
  };
  const showSchedule = hasScheduleMeta(scheduleMeta);
  const annotations = collectScheduleAnnotations(scheduleMeta);
  const backlinks = getPageBacklinks(page, access);
  const appendixToc = appendixTocItems({
    citedBy: backlinks.length,
    annotations: annotations.length,
  });
  const toc = [...((page.data.toc ?? []) as TOCItemType[]), ...appendixToc];
  const tocIds = toc
    .map((item) => item.url.replace(/^#/, ''))
    .filter((id) => id.length > 0);
  const markdownUrl = getPageMarkdownUrl(page).url;
  const hdrs = await headers();
  const origin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, { headers: Object.fromEntries(hdrs.entries()) }),
  );
  const mcpUrl = `${origin}/mcp`;
  const lastModified = page.data.lastModified;

  return (
    <div data-doc-peek="true" data-doc-path={page.url} className="flex min-h-full w-full">
      <PeekHeadingScope ids={tocIds}>
        <article className="flex min-h-full min-w-0 flex-1 flex-col px-4 py-6 md:px-5 md:pt-8 xl:px-6 xl:pt-10">
        <DocsBreadcrumb pageUrl={page.url} className="mb-2" />
        <h1 className="text-[1.5em] font-semibold">{page.data.title}</h1>
        {showSchedule ? (
          <div className="not-prose mt-2">
            <ConnectorSchedulePanel
              dataReady={scheduleMeta.dataReady}
              estimatedDuration={scheduleMeta.estimatedDuration}
              minInterval={scheduleMeta.minInterval}
            />
          </div>
        ) : null}
        {page.data.description ? (
          <p className="mt-2 text-sm text-fd-muted-foreground">{page.data.description}</p>
        ) : null}
        {Array.isArray(page.data.tags) && page.data.tags.length > 0 ? (
          <div className="not-prose mt-2 flex flex-wrap gap-1.5">
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
        <div className="not-prose mt-4 flex flex-row flex-wrap items-center gap-2 border-b pb-5" data-no-select>
          <MarkdownActionsButton markdownUrl={markdownUrl} />
          <AddMcpButton mcpUrl={mcpUrl} />
          <DocShareButton
            title={page.data.title}
            description={page.data.description}
            pageUrl={`${origin}${page.url}`}
            posterUrl={`${origin}${getPageSharePoster(page).url}`}
          />
        </div>
        <ReferencesOutbound page={page} access={access} className="mt-4" />
        <DocsBody className="mt-5 flex-1">
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page, DocsLink),
            })}
          />
        </DocsBody>
        <DocAppendix referrers={backlinks} annotations={annotations} />
        {lastModified ? (
          <PageLastUpdate date={lastModified} className="mt-auto pt-6" />
        ) : null}
        </article>
      </PeekHeadingScope>
      <PeekToc items={toc} />
    </div>
  );
}

export function peekArticleTitle(path: string): string {
  const slugs =
    path === docsRoute ? [] : path.slice(docsRoute.length + 1).split('/').filter(Boolean);
  const page = source.getPage(slugs.length ? slugs : undefined);
  return page?.data.title?.trim() || path;
}
