import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { buildOgQuoteCardProps } from '@/lib/docs/og/build-props';
import { getOgFontData, ogImageFonts } from '@/lib/docs/og/fonts';
import { estimateQuoteHeight, QUOTE_WIDTH } from '@/lib/docs/og/quote-height';
import { OgQuoteCard } from '@/lib/docs/og/template-quote';
import {
  buildPageUrlWithTextFragment,
  buildQuotePosterPath,
  normalizeQuoteText,
  verifyQuoteSignature,
} from '@/lib/docs/selection/quote-sign';
import { source } from '@/lib/docs/source/source';
import { getPublicSiteUrlIfSet } from '@/lib/core/shared';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

function resolveQuoteSiteOrigin(req: Request): string {
  const fromEnv = getPublicSiteUrlIfSet();
  if (fromEnv) return fromEnv;
  return new URL(req.url).origin;
}

const MAX_QUOTE_IMAGE_HEIGHT = 2400;

export async function renderQuoteOgImage(req: Request, slugs: string[]): Promise<Response> {
  const page = source.getPage(slugs);
  if (!page) notFound();

  const access = getDocAccessContext(req);
  if (!isDocPageAccessible(page, access)) notFound();

  const origin = resolveQuoteSiteOrigin(req);
  const url = new URL(req.url);
  const rawText = url.searchParams.get('text') ?? '';
  const quoteText = normalizeQuoteText(rawText);
  if (quoteText.length < 2) notFound();

  const pathname = buildQuotePosterPath(slugs);
  const tm = Number.parseInt(url.searchParams.get('tm') ?? '', 10);
  const sg = url.searchParams.get('sg') ?? '';
  if (!verifyQuoteSignature(pathname, quoteText, tm, sg)) notFound();

  const pageUrl = buildPageUrlWithTextFragment(`${origin}${page.url}`, quoteText);
  const quoteProps = await buildOgQuoteCardProps(page, origin, quoteText, { pageUrl });
  const height = Math.min(estimateQuoteHeight(quoteProps), MAX_QUOTE_IMAGE_HEIGHT);
  const fonts = getOgFontData();

  return new ImageResponse(<OgQuoteCard {...quoteProps} />, {
    width: QUOTE_WIDTH,
    height,
    fonts: ogImageFonts(fonts),
  });
}
