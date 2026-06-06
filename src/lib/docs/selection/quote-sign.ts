import { signatureWindowMs, sessionSecret } from '@/lib/auth/auth-config';
import { sha256Hex, timingSafeHexEqual } from '@/lib/auth/cube';

export const MAX_QUOTE_TEXT = 500;

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

export function quoteSignSecret(): string | undefined {
  return trimEnv('DOCS_QUOTE_SIGN_SECRET') ?? sessionSecret();
}

export function normalizeQuoteText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_TEXT);
}

export function buildQuoteSignature(
  pathname: string,
  text: string,
  secret: string,
  tm?: number,
): { tm: number; sg: string } {
  const timestamp = tm ?? Date.now();
  const normalized = normalizeQuoteText(text);
  const sg = sha256Hex(`GET\n${pathname}\n${timestamp}\n${normalized}\n${secret}`);
  return { tm: timestamp, sg };
}

export function verifyQuoteSignature(
  pathname: string,
  text: string,
  tm: number,
  sg: string,
): boolean {
  const secret = quoteSignSecret();
  if (!secret) return process.env.NODE_ENV !== 'production';

  if (!Number.isFinite(tm)) return false;
  if (Math.abs(Date.now() - tm) > signatureWindowMs()) return false;

  const expected = buildQuoteSignature(pathname, text, secret, tm).sg;
  return timingSafeHexEqual(expected, sg);
}

export function buildQuotePosterPath(slugs: string[]): string {
  return `/og/docs/${slugs.join('/')}/quote.png`;
}

export function buildSignedQuotePosterUrl(
  origin: string,
  slugs: string[],
  text: string,
): string | null {
  const secret = quoteSignSecret();
  const pathname = buildQuotePosterPath(slugs);
  const normalized = normalizeQuoteText(text);
  const url = new URL(`${origin}${pathname}`);

  url.searchParams.set('text', normalized);

  if (secret) {
    const { tm, sg } = buildQuoteSignature(pathname, normalized, secret);
    url.searchParams.set('tm', String(tm));
    url.searchParams.set('sg', sg);
  }

  return url.toString();
}

export function buildPageUrlWithTextFragment(pageUrl: string, exact: string): string {
  const base = pageUrl.split('#')[0];
  const encoded = encodeURIComponent(exact);
  return `${base}#:~:text=${encoded}`;
}
