import Link from 'next/link';
import { DocsBody } from 'fumadocs-ui/layouts/notebook/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { TOCItemType } from 'fumadocs-core/toc';
import { PeekToc } from '@/components/docs/peek-toc';
import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { getMDXComponents } from '@/components/docs/mdx';
import { DocsLink } from '@/components/docs/docs-link';
import { DocsBreadcrumb } from '@/components/docs/docs-breadcrumb';
import { ConnectorSchedulePanel } from '@/components/docs/connector-schedule-panel';
import { hasScheduleMeta } from '@/lib/docs/format-schedule-meta';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { source } from '@/lib/docs/source/source';
import { docsRoute } from '@/lib/core/shared';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';

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
  const toc = (page.data.toc ?? []) as TOCItemType[];

  return (
    <div data-doc-peek="true" data-doc-path={page.url} className="flex min-h-full">
      <article className="min-w-0 flex-1 px-4 py-6 md:px-5 md:pt-8 xl:px-6 xl:pt-10">
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
        <DocsBody className="mt-5">
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page, DocsLink),
            })}
          />
        </DocsBody>
      </article>
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
