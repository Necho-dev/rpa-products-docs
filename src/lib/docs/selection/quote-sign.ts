import { signatureWindowMs, sessionSecret } from '@/lib/auth/auth-config';
import { sha256Hex, timingSafeHexEqual } from '@/lib/auth/cube';
import { MAX_QUOTE_TEXT, normalizeQuoteText } from '@/lib/docs/selection/quote-text';

export { MAX_QUOTE_TEXT, normalizeQuoteText, parseTextFragmentExact } from '@/lib/docs/selection/quote-text';

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

export function quoteSignSecret(): string | undefined {
  return trimEnv('DOCS_QUOTE_SIGN_SECRET') ?? sessionSecret();
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

export function normalizeShareQuoteContext(prefix: string, suffix: string): {
  prefix: string;
  suffix: string;
} {
  return {
    prefix: prefix.replace(/\s+/g, ' ').slice(-32),
    suffix: suffix.replace(/\s+/g, ' ').slice(0, 32),
  };
}

/** 分享页定位用签名（无过期时间，便于长期分享） */
export function buildShareQuoteSignature(
  pagePath: string,
  exact: string,
  prefix: string,
  suffix: string,
  secret: string,
): string {
  const normalized = normalizeQuoteText(exact);
  const ctx = normalizeShareQuoteContext(prefix, suffix);
  return sha256Hex(`share-quote\n${pagePath}\n${normalized}\n${ctx.prefix}\n${ctx.suffix}\n${secret}`);
}

export function verifyShareQuoteSignature(
  pagePath: string,
  exact: string,
  prefix: string,
  suffix: string,
  sg: string,
): boolean {
  const secret = quoteSignSecret();
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!sg) return false;

  const expected = buildShareQuoteSignature(pagePath, exact, prefix, suffix, secret);
  return timingSafeHexEqual(expected, sg);
}

/** 生成带签名 query 的分享页 URL，并附加 Text Fragment 供浏览器原生定位 */
export function buildSignedShareQuotePageUrl(
  pageUrl: string,
  exact: string,
  prefix: string,
  suffix: string,
): string {
  const base = pageUrl.split('#')[0];
  const url = new URL(base);
  const pagePath = url.pathname;
  const normalized = normalizeQuoteText(exact);
  const ctx = normalizeShareQuoteContext(prefix, suffix);

  url.searchParams.set('q', normalized);
  if (ctx.prefix) url.searchParams.set('p', ctx.prefix);
  if (ctx.suffix) url.searchParams.set('s', ctx.suffix);

  const secret = quoteSignSecret();
  if (secret) {
    url.searchParams.set(
      'sg',
      buildShareQuoteSignature(pagePath, normalized, ctx.prefix, ctx.suffix, secret),
    );
  }

  return buildPageUrlWithTextFragment(url.toString(), normalized);
}
