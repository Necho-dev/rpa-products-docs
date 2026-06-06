import type { OgQuoteCardProps } from '@/lib/docs/og/template-quote';
import { QUOTE_WIDTH } from '@/lib/docs/og/template-quote';

const CARD_TOP = 44;
const TOPBAR = 68;
const TITLE = 88;
const SECTION = 44;
const FOOTER = 160;
const QUOTE_PADDING = 32;

function estimateQuoteBodyHeight(text: string): number {
  const len = text.length;
  const fontSize = len <= 80 ? 36 : len <= 160 ? 30 : len <= 280 ? 26 : 22;
  const lineHeight = 1.65;
  const charsPerLine = Math.floor((QUOTE_WIDTH - 5 - 52 * 2 - 72 - 16) / (fontSize * 0.55));
  const lines = Math.max(1, Math.ceil(len / Math.max(charsPerLine, 12)));
  return Math.ceil(lines * fontSize * lineHeight) + 80;
}

export function estimateQuoteHeight(props: OgQuoteCardProps): number {
  let h = CARD_TOP + TOPBAR + TITLE;
  if (props.sectionHeading) h += SECTION;
  h += estimateQuoteBodyHeight(props.quoteText);
  h += QUOTE_PADDING + FOOTER;
  return h;
}

export { QUOTE_WIDTH };
