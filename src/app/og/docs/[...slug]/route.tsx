/**
 * 静态 OG 路由: 面向 cover / image / poster 三种 OG 图片
 * build 期由 generateStaticParams 预生成
 */
import type { ReactElement } from 'react';
import { buildOgCoverProps } from '@/lib/docs/og/build-cover-props';
import { buildOgShareBaseProps, buildOgSharePosterProps } from '@/lib/docs/og/build-props';
import { getOgFontData, ogImageFonts } from '@/lib/docs/og/fonts';
import { estimatePosterHeight, POSTER_WIDTH } from '@/lib/docs/og/poster-height';
import { OgCoverCard, COVER_HEIGHT, COVER_WIDTH } from '@/lib/docs/og/template-cover';
import { OgShareCard } from '@/lib/docs/og/template-card';
import { OgSharePoster } from '@/lib/docs/og/template-poster';
import { getPageCover, getPageImage, getPageSharePoster, source } from '@/lib/docs/source/source';
import { resolveOgSiteOrigin } from '@/lib/core/site-origin';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const revalidate = false;
export const dynamicParams = true;

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const fileName = slug[slug.length - 1];
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const fonts = getOgFontData();
  const origin = resolveOgSiteOrigin();

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
