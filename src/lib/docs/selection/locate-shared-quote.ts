import {
  collectHighlightSegments,
  findRangeForHighlightQuote,
  unwrapHighlightMark,
  wrapHighlightRange,
} from '@/lib/docs/selection/apply-highlights';
import { findProseContainer } from '@/lib/docs/selection/get-selection-in-container';
import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';
import { flashHighlight } from '@/lib/docs/selection/scroll-to-highlight';
import { normalizeQuoteText, parseTextFragmentExact } from '@/lib/docs/selection/quote-text';

export type SharedQuotePayload = {
  exact: string;
  prefix: string;
  suffix: string;
};

export const SHARED_PREVIEW_HIGHLIGHT_ID = '__shared-quote-preview__';

export function readSharedQuoteFromSearchParams(params: URLSearchParams): SharedQuotePayload | null {
  const q = params.get('q');
  if (!q) return null;

  return {
    exact: normalizeQuoteText(q),
    prefix: params.get('p') ?? '',
    suffix: params.get('s') ?? '',
  };
}

export function readSharedQuoteFromHash(): SharedQuotePayload | null {
  if (typeof window === 'undefined') return null;
  const exact = parseTextFragmentExact(window.location.hash);
  if (!exact) return null;
  return { exact, prefix: '', suffix: '' };
}

export function hasSharedQuoteQueryParams(params: URLSearchParams): boolean {
  return params.has('q');
}

export function removeSharedPreviewHighlight(container: HTMLElement): void {
  collectHighlightSegments(SHARED_PREVIEW_HIGHLIGHT_ID, container).forEach((el) => {
    unwrapHighlightMark(el);
  });
}

function scrollRangeIntoView(range: Range): void {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    const targetY =
      window.scrollY + rect.top - window.innerHeight / 2 + Math.max(rect.height, 24) / 2;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    return;
  }

  range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function locateSharedQuoteRange(
  container: HTMLElement,
  quote: SharedQuotePayload,
): Range | null {
  return findRangeForHighlightQuote(container, quote);
}

export function applySharedPreviewHighlight(
  container: HTMLElement,
  quote: SharedQuotePayload,
  range: Range,
): boolean {
  removeSharedPreviewHighlight(container);

  const preview: Pick<DocHighlight, 'id' | 'color'> = {
    id: SHARED_PREVIEW_HIGHLIGHT_ID,
    color: 'yellow',
  };

  const ok = wrapHighlightRange(range, preview);
  if (!ok) return false;

  for (const el of collectHighlightSegments(SHARED_PREVIEW_HIGHLIGHT_ID, container)) {
    el.dataset.sharedPreview = 'true';
  }

  return true;
}

export async function locateAndPreviewSharedQuote(
  quote: SharedQuotePayload,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<{ ok: boolean; range: Range | null }> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 120;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const container = findProseContainer();
    if (container) {
      const range = locateSharedQuoteRange(container, quote);
      if (range) {
        applySharedPreviewHighlight(container, quote, range);
        scrollRangeIntoView(range);
        flashHighlight(collectHighlightSegments(SHARED_PREVIEW_HIGHLIGHT_ID, container));
        return { ok: true, range };
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return { ok: false, range: null };
}
