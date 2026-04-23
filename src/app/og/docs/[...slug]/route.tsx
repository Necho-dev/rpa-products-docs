import { getDocAccessContext } from '@/lib/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs-access-effective';
import { isDocPageAccessible } from '@/lib/docs-site-tools';
import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { siteName } from '@/lib/shared';

export const revalidate = false;

export async function GET(req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const access = getDocAccessContext(req);
  if (!isDocPageAccessible(page, access)) notFound();

  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site={siteName} />,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  const skipPrivateOg = Boolean(process.env.DOCS_PRIVATE_ACCESS_TOKEN?.trim());
  return source
    .getPages()
    .filter((page) => !skipPrivateOg || getEffectiveDocAccess(page) !== 'private')
    .map((page) => ({
      lang: page.locale,
      slug: getPageImage(page).segments,
    }));
}
