import { getDocAccessContextFromRequest } from '@/lib/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs-site-tools';
import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getGitBlobEditUrlForDocPath, getSiteDescription, siteName } from '@/lib/shared';
import { AddMcpButton } from '@/components/add-mcp-button';
import { headers } from 'next/headers';
import { inferSiteOrigin } from '@/lib/site-origin';

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
    redirect(`/docs/access?next=${encodeURIComponent(page.url)}`);
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  const hdrs = await headers();
  const origin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, { headers: Object.fromEntries(hdrs.entries()) }),
  );
  const mcpUrl = `${origin}/mcp`;

  const gitSourceUrl = getGitBlobEditUrlForDocPath(page.path);
  const lastModified = page.data.lastModified;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full} className={docsPageArticleClassName}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={gitSourceUrl}
        />
        <AddMcpButton mcpUrl={mcpUrl} />
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: getPageImage(page).url,
    },
  };
}
