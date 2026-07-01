import type { ReactElement } from 'react';
import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs/access/docs-access-effective';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { buildOgCoverProps } from '@/lib/docs/og/build-cover-props';
import { buildOgShareBaseProps, buildOgSharePosterProps, buildOgQuoteCardProps } from '@/lib/docs/og/build-props';
import { getOgFontData, ogImageFonts } from '@/lib/docs/og/fonts';
import { estimateQuoteHeight, QUOTE_WIDTH } from '@/lib/docs/og/quote-height';
import { estimatePosterHeight, POSTER_WIDTH } from '@/lib/docs/og/poster-height';
import { OgCoverCard, COVER_HEIGHT, COVER_WIDTH } from '@/lib/docs/og/template-cover';
import { OgShareCard } from '@/lib/docs/og/template-card';
import { OgSharePoster } from '@/lib/docs/og/template-poster';
import { OgQuoteCard } from '@/lib/docs/og/template-quote';
import { normalizeQuoteText, verifyQuoteSignature, buildPageUrlWithTextFragment } from '@/lib/docs/selection/quote-sign';
import { getPageCover, getPageImage, getPageSharePoster, source } from '@/lib/docs/source/source';
import { resolveOgSiteOrigin } from '@/lib/core/site-origin';
import { getPublicSiteUrlIfSet } from '@/lib/core/shared';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const revalidate = false;
export const dynamicParams = true;

const MAX_QUOTE_IMAGE_HEIGHT = 2400;
const OG_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function ogImageResponse(
  element: ReactElement,
  options: ConstructorParameters<typeof ImageResponse>[1],
): ImageResponse {
  return new ImageResponse(element, {
    ...options,
    headers: {
      ...options?.headers,
      'Cache-Control': OG_CACHE_CONTROL,
    },
  });
}

function resolveQuoteSiteOrigin(req: Request): string {
  const fromEnv = getPublicSiteUrlIfSet();
  if (fromEnv) return fromEnv;
  return new URL(req.url).origin;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const fileName = slug[slug.length - 1];
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  if (fileName === 'quote.png') {
    const fonts = getOgFontData();
    const access = getDocAccessContext(req);
    if (!isDocPageAccessible(page, access)) notFound();

    const origin = resolveQuoteSiteOrigin(req);
    const url = new URL(req.url);
    const rawText = url.searchParams.get('text') ?? '';
    const quoteText = normalizeQuoteText(rawText);
    if (quoteText.length < 2) notFound();

    const pathname = `/og/docs/${slug.join('/')}`;
    const tm = Number.parseInt(url.searchParams.get('tm') ?? '', 10);
    const sg = url.searchParams.get('sg') ?? '';
    if (!verifyQuoteSignature(pathname, quoteText, tm, sg)) notFound();

    const pageUrl = buildPageUrlWithTextFragment(`${origin}${page.url}`, quoteText);
    const quoteProps = await buildOgQuoteCardProps(page, origin, quoteText, { pageUrl });
    const height = Math.min(estimateQuoteHeight(quoteProps), MAX_QUOTE_IMAGE_HEIGHT);

    return new ImageResponse(<OgQuoteCard {...quoteProps} />, {
      width: QUOTE_WIDTH,
      height,
      fonts: ogImageFonts(fonts),
    });
  }

  const fonts = getOgFontData();

  if (getEffectiveDocAccess(page) === 'private') {
    const access = getDocAccessContext(req);
    if (!isDocPageAccessible(page, access)) notFound();
  }

  const origin = resolveOgSiteOrigin(req);

  if (fileName === 'poster.png') {
    const posterProps = await buildOgSharePosterProps(page, origin);
    const height = estimatePosterHeight(posterProps);

    return ogImageResponse(<OgSharePoster {...posterProps} />, {
      width: POSTER_WIDTH,
      height,
      fonts: ogImageFonts(fonts),
    });
  }

  if (fileName === 'cover.png') {
    const coverProps = await buildOgCoverProps(page);

    return ogImageResponse(<OgCoverCard {...coverProps} />, {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      fonts: ogImageFonts(fonts),
    });
  }

  if (fileName !== 'image.png') {
    notFound();
  }

  const cardProps = buildOgShareBaseProps(page, origin);

  return ogImageResponse(<OgShareCard {...cardProps} />, {
    width: 1200,
    height: 630,
    fonts: ogImageFonts(fonts),
  });
}

export function generateStaticParams() {
  return source.getPages().flatMap((page) => [
    { slug: getPageImage(page).segments },
    { slug: getPageSharePoster(page).segments },
    { slug: getPageCover(page).segments },
  ]);
}
