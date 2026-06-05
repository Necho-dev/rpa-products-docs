import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs/access/docs-access-effective';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { buildOgShareBaseProps, buildOgSharePosterProps } from '@/lib/docs/og/build-props';
import { getOgFontData, ogImageFonts } from '@/lib/docs/og/fonts';
import { estimatePosterHeight, POSTER_WIDTH } from '@/lib/docs/og/poster-height';
import { OgShareCard } from '@/lib/docs/og/template-card';
import { OgSharePoster } from '@/lib/docs/og/template-poster';
import { getPageImage, getPageSharePoster, source } from '@/lib/docs/source/source';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const revalidate = false;

export async function GET(req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const fileName = slug[slug.length - 1];
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const access = getDocAccessContext(req);
  if (!isDocPageAccessible(page, access)) notFound();

  const origin = inferSiteOrigin(req);
  const fonts = getOgFontData();

  if (fileName === 'poster.png') {
    const posterProps = await buildOgSharePosterProps(page, origin);
    const height = estimatePosterHeight(posterProps);

    return new ImageResponse(<OgSharePoster {...posterProps} />, {
      width: POSTER_WIDTH,
      height,
      fonts: ogImageFonts(fonts),
    });
  }

  if (fileName !== 'image.png') {
    notFound();
  }

  const cardProps = buildOgShareBaseProps(page, origin);

  return new ImageResponse(<OgShareCard {...cardProps} />, {
    width: 1200,
    height: 630,
    fonts: ogImageFonts(fonts),
  });
}

export function generateStaticParams() {
  const skipPrivateOg = Boolean(process.env.DOCS_PRIVATE_ACCESS_TOKEN?.trim());
  return source
    .getPages()
    .filter((page) => !skipPrivateOg || getEffectiveDocAccess(page) !== 'private')
    .flatMap((page) => [
      { lang: page.locale, slug: getPageImage(page).segments },
      { lang: page.locale, slug: getPageSharePoster(page).segments },
    ]);
}
