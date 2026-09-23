import { createHmac, timingSafeEqual } from 'node:crypto';
import { resourceSignSecret, resourceSignTtlMs } from '@/lib/auth/auth-config';

const SIGN_PREFIX = 'GET';

function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function hmacHex(pathname: string, exp: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${SIGN_PREFIX}\n${pathname}\n${exp}\n${secret}`, 'utf8')
    .digest('hex');
}

/** `sign={exp}.{hmac}`，exp 为毫秒时间戳 */
export function buildResourceSign(pathname: string, exp?: number): string | null {
  const secret = resourceSignSecret();
  if (!secret) return null;
  const expires = exp ?? Date.now() + resourceSignTtlMs();
  return `${expires}.${hmacHex(pathname, expires, secret)}`;
}

export function verifyResourceSignValue(pathname: string, sign: string): boolean {
  const secret = resourceSignSecret();
  if (!secret) return false;
  const dot = sign.indexOf('.');
  if (dot <= 0) return false;
  const expRaw = sign.slice(0, dot);
  const hmac = sign.slice(dot + 1);
  if (!hmac) return false;
  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp)) return false;
  if (Date.now() > exp) return false;
  const expected = hmacHex(pathname, exp, secret);
  return timingSafeHexEqual(expected, hmac);
}

export function signResourcePath(pathname: string): string | null {
  const sign = buildResourceSign(pathname);
  if (!sign) return null;
  const url = new URL(pathname, 'http://docs.local');
  url.searchParams.set('sign', sign);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

/** 给绝对或站内 `/resources/images/...` URL 追加 `?sign=`（已有且仍有效则保持） */
export function withResourceSign(src: string): string {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  let url: URL;
  try {
    url = src.startsWith('http://') || src.startsWith('https://')
      ? new URL(src)
      : new URL(src, 'http://docs.local');
  } catch {
    return src;
  }
  if (!url.pathname.startsWith('/resources/images/')) return src;

  const existing = url.searchParams.get('sign');
  if (existing && verifyResourceSignValue(url.pathname, existing)) {
    return src;
  }
  const signed = signResourcePath(url.pathname);
  if (!signed) return src;
  const qs = signed.split('?')[1] ?? '';
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const abs = new URL(src);
    abs.search = qs ? `?${qs}` : '';
    return abs.toString();
  }
  return signed;
}

export function verifyResourceSignRequest(request: Request): boolean {
  const url = new URL(request.url);
  const sign = url.searchParams.get('sign')?.trim() ?? '';
  if (!sign) return false;
  return verifyResourceSignValue(url.pathname, sign);
}
