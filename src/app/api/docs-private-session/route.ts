import { createHash, timingSafeEqual } from 'node:crypto';
import {
  computePrivateDocSessionCookie,
  isPrivateDocAccessConfigured,
  PRIVATE_DOC_COOKIE,
} from '@/lib/doc-access';

export const runtime = 'nodejs';

function submittedTokenMatches(expected: string, submitted: string): boolean {
  const eh = createHash('sha256').update(expected, 'utf8').digest();
  const sh = createHash('sha256').update(submitted, 'utf8').digest();
  return eh.length === sh.length && timingSafeEqual(eh, sh);
}

export async function POST(req: Request) {
  const secret = process.env.DOCS_PRIVATE_ACCESS_TOKEN?.trim();
  if (!secret) {
    return Response.json({ error: 'Private doc access is not configured' }, { status: 501 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token =
    typeof body === 'object' &&
    body !== null &&
    'token' in body &&
    typeof (body as { token: unknown }).token === 'string'
      ? (body as { token: string }).token.trim()
      : '';

  if (!submittedTokenMatches(secret, token)) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const val = computePrivateDocSessionCookie();
  const secure = process.env.NODE_ENV === 'production';
  const cookieHeader = [
    `${PRIVATE_DOC_COOKIE}=${encodeURIComponent(val)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 30}`,
    ...(secure ? ['Secure' as const] : []),
  ].join('; ');

  return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookieHeader } });
}

/** 清除会话 Cookie（登出） */
export async function DELETE() {
  if (!isPrivateDocAccessConfigured()) {
    return Response.json({ ok: true });
  }
  const secure = process.env.NODE_ENV === 'production';
  const clear = [
    `${PRIVATE_DOC_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure' as const] : []),
  ].join('; ');
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clear } });
}
