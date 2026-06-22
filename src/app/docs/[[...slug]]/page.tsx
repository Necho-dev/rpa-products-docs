import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { DocShareButton } from '@/components/docs/doc-share-dialog';
import { getPageImage, getPageMarkdownUrl, getPageSharePoster, source } from '@/lib/docs/source/source';
import { resolveModuleGridStackToc } from '@/lib/docs/source/module-grid-runtime';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  PageLastUpdate,
} from 'fumadocs-ui/layouts/docs/page';
import { MarkdownActionsButton } from '@/components/docs/markdown-copy-button';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/components/docs/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getSiteDescription, siteName } from '@/lib/core/shared';
import { AddMcpButton } from '@/components/docs/add-mcp-button';
import { headers } from 'next/headers';
import { inferSiteOrigin } from '@/lib/core/site-origin';

/** 路由段配置须为静态字面量；按请求做私有文档鉴权也需动态渲染 */
export const dynamic = 'force-dynamic';

/** 去掉默认 max-w-[900px]，在 grid 主栏内拉满；略减横向 padding 换可读宽度 */
const docsPageArticleClassName =
  'flex max-w-none w-full flex-col gap-4 px-4 py-6 md:px-5 md:pt-8 xl:px-6 xl:pt-12 xl:layout:[--fd-toc-width:13.5rem]';

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
  const stackToc = await resolveModuleGridStackToc(page.slugs, access);
  const toc =
    stackToc.length > 0 ? [...(page.data.toc ?? []), ...stackToc] : page.data.toc;

  return (
    <DocsPage toc={toc} full={page.data.full} className={docsPageArticleClassName}>
      <div className="flex flex-col gap-1.5">
        <DocsTitle className="mb-2">{page.data.title}</DocsTitle>
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
            a: createRelativeLink(source, page),
          })}
        />
        {lastModified ? <PageLastUpdate date={lastModified} /> : null}
      </DocsBody>
    </DocsPage>
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
