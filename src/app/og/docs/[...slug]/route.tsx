/**
 * 运行时 OG: 面向 cover / image / poster 的 OG 图片生成;
 * 按 origin 缓存; 禁止 ISR 按路径冻死二维码
 */
import type { ReactElement } from 'react';
import { getEffectiveDocAccess } from '@/lib/docs/access/docs-access-effective';
import { buildOgCoverProps } from '@/lib/docs/og/build-cover-props';
import { buildOgShareBaseProps, buildOgSharePosterProps } from '@/lib/docs/og/build-props';
import { getOgFontData, ogImageFonts } from '@/lib/docs/og/fonts';
import { estimatePosterHeight, POSTER_WIDTH } from '@/lib/docs/og/poster-height';
import { getOrCreateOgPng, ogCacheKey } from '@/lib/docs/og/runtime-cache';
import { OgCoverCard, COVER_HEIGHT, COVER_WIDTH } from '@/lib/docs/og/template-cover';
import { OgShareCard } from '@/lib/docs/og/template-card';
import { OgSharePoster } from '@/lib/docs/og/template-poster';
import { source } from '@/lib/docs/source/source';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OG_SHARE_TTL_MS = 10 * 60 * 1000;
const OG_COVER_TTL_MS = 60 * 1000;
const OG_SHARE_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const OG_COVER_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=3600';
const OG_PRIVATE_CACHE_CONTROL = 'private, no-store';
const OG_VARY = 'Host, X-Forwarded-Host';

function fingerprint(page: { data: { lastModified?: Date | string } }): string {
  const raw = page.data.lastModified;
  if (!raw) return '';
  return raw instanceof Date ? raw.toISOString() : String(raw);
}

async function renderPng(
  element: ReactElement,
  options: ConstructorParameters<typeof ImageResponse>[1],
): Promise<Buffer> {
  const image = new ImageResponse(element, options);
  return Buffer.from(await image.arrayBuffer());
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const fileName = slug[slug.length - 1];
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  if (fileName !== 'poster.png' && fileName !== 'cover.png' && fileName !== 'image.png') {
    notFound();
  }

  const origin = inferSiteOrigin(req);
  const fonts = getOgFontData();
  const isPrivate = getEffectiveDocAccess(page) === 'private';
  const cacheControl = isPrivate
    ? OG_PRIVATE_CACHE_CONTROL
    : fileName === 'cover.png'
      ? OG_COVER_CACHE_CONTROL
      : OG_SHARE_CACHE_CONTROL;
  const ttlMs = fileName === 'cover.png' ? OG_COVER_TTL_MS : OG_SHARE_TTL_MS;
  const key = ogCacheKey({
    variant: fileName,
    origin,
    pageUrl: page.url,
    fingerprint: fingerprint(page),
  });

  const body = await getOrCreateOgPng({
    key,
    ttlMs,
    render: async () => {
      if (fileName === 'poster.png') {
        const posterProps = await buildOgSharePosterProps(page, origin);
        const height = estimatePosterHeight(posterProps);
        return renderPng(<OgSharePoster {...posterProps} />, {
          width: POSTER_WIDTH,
          height,
          fonts: ogImageFonts(fonts),
        });
      }
      if (fileName === 'cover.png') {
        const coverProps = await buildOgCoverProps(page);
        return renderPng(<OgCoverCard {...coverProps} />, {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          fonts: ogImageFonts(fonts),
        });
      }
      const cardProps = buildOgShareBaseProps(page, origin);
      return renderPng(<OgShareCard {...cardProps} />, {
        width: 1200,
        height: 630,
        fonts: ogImageFonts(fonts),
      });
    },
  });

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': cacheControl,
      Vary: OG_VARY,
    },
  });
}
