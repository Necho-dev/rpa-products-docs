import {
  collectHighlightSegments,
  ensureHighlightInDom,
  findRangeForHighlightQuote,
} from '@/lib/docs/selection/apply-highlights';
import { findProseContainer } from '@/lib/docs/selection/get-selection-in-container';
import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';

const FLASH_CLASS = 'doc-highlight-flash';
const FLASH_DURATION_MS = 1500;

function scrollRangeIntoView(range: Range): void {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    const targetY =
      window.scrollY + rect.top - window.innerHeight / 2 + Math.max(rect.height, 24) / 2;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    return;
  }

  const marker = document.createElement('span');
  marker.setAttribute('data-doc-highlight-scroll-marker', 'true');
  marker.style.display = 'inline';
  marker.textContent = '\u200b';
  try {
    range.insertNode(marker);
    marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    marker.remove();
  }
}

export function flashHighlight(segments: HTMLElement[]): void {
  if (segments.length === 0) return;

  for (const el of segments) {
    el.classList.add(FLASH_CLASS);
  }

  window.setTimeout(() => {
    for (const el of segments) {
      el.classList.remove(FLASH_CLASS);
    }
  }, FLASH_DURATION_MS);
}

function scrollSegmentsIntoView(segments: HTMLElement[]): void {
  if (segments.length === 0) return;
  segments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashHighlight(segments);
}

export function scrollToHighlight(highlightId: string, root?: ParentNode): boolean {
  const scope = root ?? findProseContainer() ?? document;
  const segments = collectHighlightSegments(highlightId, scope);
  if (segments.length === 0) return false;

  scrollSegmentsIntoView(segments);
  return true;
}

/** 恢复 mark（若缺失）并滚动到划线；必要时仅用 quote 定位文本 */
export function locateHighlightInDom(
  container: HTMLElement,
  highlight: DocHighlight,
): boolean {
  ensureHighlightInDom(container, highlight);

  const segments = collectHighlightSegments(highlight.id, container);
  if (segments.length > 0) {
    scrollSegmentsIntoView(segments);
    return true;
  }

  const range = findRangeForHighlightQuote(container, highlight);
  if (!range) return false;

  scrollRangeIntoView(range);
  return true;
}

export async function locateAndScrollToHighlight(
  highlight: DocHighlight,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? 15;
  const intervalMs = options?.intervalMs ?? 120;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const container = findProseContainer();
    if (container && locateHighlightInDom(container, highlight)) {
      return true;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return false;
}

export async function scrollToHighlightWithRetry(
  highlightId: string,
  options?: { maxAttempts?: number; intervalMs?: number; root?: ParentNode },
): Promise<boolean> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const intervalMs = options?.intervalMs ?? 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const root = options?.root ?? findProseContainer() ?? document;
    if (scrollToHighlight(highlightId, root)) return true;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return false;
}
