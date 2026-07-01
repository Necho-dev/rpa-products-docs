import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
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
import { source } from '@/lib/docs/source/source';
import { resolveOgSiteOrigin } from '@/lib/core/site-origin';
import { getPublicSiteUrlIfSet } from '@/lib/core/shared';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-dynamic';

const MAX_QUOTE_IMAGE_HEIGHT = 2400;
const OG_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * 磁盘缓存根目录：构建期由 scripts/prerender-og.tsx 预填充，
 * 运行时命中直接读文件；未命中（如开发环境）则渲染后写盘作为兜底。
 */
const OG_CACHE_DIR = path.join(process.cwd(), '.next/cache/og');

/**
 * 从磁盘缓存读取或按需渲染 OG 图片。
 * key 格式：slug.join('/') + '/' + fileName，根页直接是 fileName。
 */
async function serveOgImage(
  cacheKey: string,
  render: () => ImageResponse,
): Promise<Response> {
  const filePath = path.join(OG_CACHE_DIR, cacheKey);
  try {
    const buf = await readFile(filePath);
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': OG_CACHE_CONTROL,
        'X-OG-Cache': 'HIT',
      },
    });
  } catch {
    // 磁盘未命中（开发环境 / 预生成失败兜底）：渲染并异步写盘
    const imgResponse = render();
    const buf = Buffer.from(await imgResponse.arrayBuffer());
    mkdir(path.dirname(filePath), { recursive: true })
      .then(() => writeFile(filePath, buf))
      .catch(() => {});
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': OG_CACHE_CONTROL,
        'X-OG-Cache': 'MISS',
      },
    });
  }
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
  const cacheKey = slug.join('/');

  if (fileName === 'poster.png') {
    const posterProps = await buildOgSharePosterProps(page, origin);
    const height = estimatePosterHeight(posterProps);
    return serveOgImage(cacheKey, () =>
      new ImageResponse(<OgSharePoster {...posterProps} />, {
        width: POSTER_WIDTH,
        height,
        fonts: ogImageFonts(fonts),
      }),
    );
  }

  if (fileName === 'cover.png') {
    const coverProps = await buildOgCoverProps(page);
    return serveOgImage(cacheKey, () =>
      new ImageResponse(<OgCoverCard {...coverProps} />, {
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        fonts: ogImageFonts(fonts),
      }),
    );
  }

  if (fileName !== 'image.png') {
    notFound();
  }

  const cardProps = buildOgShareBaseProps(page, origin);
  return serveOgImage(cacheKey, () =>
    new ImageResponse(<OgShareCard {...cardProps} />, {
      width: 1200,
      height: 630,
      fonts: ogImageFonts(fonts),
    }),
  );
}
