import { siteName } from '@/lib/core/shared';
import { computeHeroDisplayHeight, loadHeroImageAsset } from '@/lib/docs/og/hero-image';
import { POSTER_WIDTH } from '@/lib/docs/og/poster-height';
import { generateQrDataUrl } from '@/lib/docs/og/qr';
import type { OgShareBaseProps, OgSharePosterProps } from '@/lib/docs/og/types';
import type { source } from '@/lib/docs/source/source';

type Page = (typeof source)['$inferPage'];

function hostnameFromOrigin(origin: string): string | undefined {
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

type PageExtras = {
  entry?: string;
  tags?: string[];
  badge?: { label: string; color?: string };
};

export function buildOgShareBaseProps(page: Page, origin: string): OgShareBaseProps {
  const data = page.data as PageExtras & {
    title: string;
    description?: string;
  };
  return {
    siteName,
    title: data.title,
    description: data.description,
    badge: data.badge,
    entry: data.entry,
    tags: data.tags,
    hostname: hostnameFromOrigin(origin),
  };
}

export async function buildOgSharePosterProps(
  page: Page,
  origin: string,
): Promise<OgSharePosterProps> {
  const base = buildOgShareBaseProps(page, origin);
  const pageUrl = `${origin}${page.url}`;

  const raw = await page.data.getText('raw');
  const [qrDataUrl, heroImage] = await Promise.all([
    generateQrDataUrl(pageUrl),
    loadHeroImageAsset(page.path, raw),
  ]);

  const contentWidth = POSTER_WIDTH - 5 - 52 * 2;
  const heroImageHeight = heroImage
    ? computeHeroDisplayHeight(heroImage.width, heroImage.height, contentWidth)
    : undefined;

  return {
    ...base,
    pageUrl,
    qrDataUrl,
    heroImageDataUrl: heroImage?.dataUrl,
    heroImageHeight,
  };
}
