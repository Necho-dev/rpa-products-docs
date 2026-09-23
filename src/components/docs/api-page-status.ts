export type HttpStatusTone = 'info' | 'success' | 'redirect' | 'client' | 'server' | 'other';

export function httpStatusTone(code: string): HttpStatusTone {
  const digit = code.trim().charAt(0);
  if (digit === '1') return 'info';
  if (digit === '2') return 'success';
  if (digit === '3') return 'redirect';
  if (digit === '4') return 'client';
  if (digit === '5') return 'server';
  return 'other';
}

export function extractHttpStatusCode(text: string): string | undefined {
  const match = text.match(/\b(\d{3})\b/);
  return match?.[1];
}
