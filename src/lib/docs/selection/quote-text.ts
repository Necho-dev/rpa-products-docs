export const MAX_QUOTE_TEXT = 500;

export function normalizeQuoteText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_TEXT);
}

export function parseTextFragmentExact(hash: string): string | null {
  const marker = ':~:text=';
  const index = hash.indexOf(marker);
  if (index === -1) return null;

  const raw = hash.slice(index + marker.length).split('&')[0];
  if (!raw) return null;

  try {
    return normalizeQuoteText(decodeURIComponent(raw));
  } catch {
    return null;
  }
}
