import {
  DOCS_CUBE_ORIGIN_COOKIE,
  DOCS_CUBE_USER_COOKIE,
  DOCS_SESSION_COOKIE,
} from '@/lib/auth/cookie-names';
import {
  sessionRefreshAfterSec,
  sessionReauthAfterSec,
  sessionSecret,
  sessionTtlSec,
} from '@/lib/auth/auth-config';
import { dumpsTimed, loadsTimed } from '@/lib/auth/timed-serializer';

export type SessionPayload = {
  u: string;
  s: string;
  /** 最近一次签发/静默续期时间 */
  t: number;
  /** 上次经魔方 docsAuth 成功登录的时间 */
  iat: number;
};

function asSessionPayload(raw: Record<string, unknown>): SessionPayload | null {
  const u = raw.u;
  const s = raw.s;
  const t = raw.t;
  if (typeof u !== 'string' || !u) return null;
  if (typeof s !== 'string') return null;
  if (typeof t !== 'number' || !Number.isFinite(t)) return null;
  const iatRaw = raw.iat;
  const iat =
    typeof iatRaw === 'number' && Number.isFinite(iatRaw) ? iatRaw : t;
  return { u, s, t, iat };
}

export function safeRedirectPath(input: string | null | undefined): string {
  if (!input || typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//')) {
    return '/';
  }
  return input;
}

export function issueSessionToken(
  payload: Pick<SessionPayload, 'u' | 's'> & { iat?: number },
): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('DOCS_SESSION_SECRET is not configured');
  const now = Math.floor(Date.now() / 1000);
  const iat = payload.iat ?? now;
  return dumpsTimed(secret, { u: payload.u, s: payload.s, t: now, iat });
}

export function parseSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const raw = loadsTimed(secret, token, sessionTtlSec());
  if (!raw) return null;
  return asSessionPayload(raw);
}

export function sessionNeedsReauth(payload: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - payload.iat >= sessionReauthAfterSec();
}

export function sessionNeedsRefresh(payload: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - payload.t >= sessionRefreshAfterSec();
}

export function sessionNeedsSilentRefresh(payload: SessionPayload): boolean {
  return sessionNeedsRefresh(payload) && !sessionNeedsReauth(payload);
}

export function readSessionFromCookieHeader(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${DOCS_SESSION_COOKIE}=([^;]*)`),
  );
  const raw = match?.[1];
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  return parseSessionToken(decoded);
}

export function sessionCookieHeader(
  token: string,
  request: Request,
  maxAgeSec: number = sessionTtlSec(),
): string {
  const secure =
    request.url.startsWith('https://') ||
    request.headers.get('x-forwarded-proto') === 'https';
  return [
    `${DOCS_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function cubeOriginCookieHeader(origin: string, request: Request): string {
  const secure =
    request.url.startsWith('https://') ||
    request.headers.get('x-forwarded-proto') === 'https';
  const maxAge = 30 * 24 * 3600;
  return [
    `${DOCS_CUBE_ORIGIN_COOKIE}=${encodeURIComponent(origin)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function accessUserCookieHeader(
  userName: string,
  request: Request,
  maxAgeSec: number = sessionTtlSec(),
): string {
  const secure =
    request.url.startsWith('https://') ||
    request.headers.get('x-forwarded-proto') === 'https';
  return [
    `${DOCS_CUBE_USER_COOKIE}=${encodeURIComponent(userName)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function readAccessUserFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${DOCS_CUBE_USER_COOKIE}=([^;]*)`),
  );
  const raw = match?.[1];
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded || null;
  } catch {
    return raw || null;
  }
}

export function readCubeOriginFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${DOCS_CUBE_ORIGIN_COOKIE}=([^;]*)`),
  );
  const raw = match?.[1];
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded || null;
  } catch {
    return raw || null;
  }
}

export function appendSessionCookie(
  headers: Headers,
  request: Request,
  payload: Pick<SessionPayload, 'u' | 's'> & { iat?: number },
): void {
  const token = issueSessionToken(payload);
  headers.append('Set-Cookie', sessionCookieHeader(token, request));
  headers.append('Set-Cookie', accessUserCookieHeader(payload.u, request));
}

export function withSessionRefresh(
  response: Response,
  request: Request,
  session: SessionPayload,
): Response {
  const headers = new Headers(response.headers);
  appendSessionCookie(headers, request, {
    u: session.u,
    s: session.s,
    iat: session.iat,
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function shouldRefreshSession(session: SessionPayload | null): session is SessionPayload {
  return Boolean(session && sessionNeedsSilentRefresh(session));
}
