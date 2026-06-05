import type { OgSharePosterProps } from '@/lib/docs/og/types';

export const POSTER_WIDTH = 1080;

/**
 * 精算竖版 Poster 画布高度（卡片铺满，底栏灰底贴底）。
 */
export function estimatePosterHeight(props: OgSharePosterProps): number {
  const CARD_TOP = 44;
  const TOPBAR = 68;
  const TITLE_SINGLE = 100;
  const TITLE_MULTI = 148;
  const ENTRY_BLOCK = 70;
  const DESC_SHORT = 80;
  const DESC_LONG = 128;
  const TAGS_ROW = 48;
  const FOOTER = 160; // 灰底区 padding + QR + 两行 URL
  const HERO_MARGIN = 24;

  let h = CARD_TOP + TOPBAR;

  h += props.title.length > 18 ? TITLE_MULTI : TITLE_SINGLE;

  if (props.entry) h += ENTRY_BLOCK;

  if (props.description) {
    h += props.description.length > 40 ? DESC_LONG : DESC_SHORT;
  }

  if (props.heroImageHeight) {
    h += props.heroImageHeight + HERO_MARGIN;
  }

  if (props.tags && props.tags.length > 0) h += TAGS_ROW;

  h += FOOTER;

  return h;
}
