import type { NextRequest } from 'next/server';
import { isCubeSsoEnabled, isSecureCookieRequest } from '@/lib/auth/auth-config';
import {
  DOCS_CUBE_ORIGIN_COOKIE,
  DOCS_CUBE_USER_COOKIE,
  DOCS_SESSION_COOKIE,
} from '@/lib/auth/cookie-names';
import { isValidCubeOrigin } from '@/lib/auth/cube';
import { extractBearerToken, parseMcpBearerToken, parseMcpBearerTokenLite, clearMcpTokenCookieHeader } from '@/lib/auth/mcp-token';
import {
  readSessionFromCookieHeader,
  safeRedirectPath,
  sessionNeedsReauth,
  sessionNeedsSilentRefresh,
  type SessionPayload,
} from '@/lib/auth/session';
import { mcpResourceUrlsForRequest } from '@/lib/core/site-origin';
import { PRIVATE_DOC_COOKIE } from '@/lib/docs/access/doc-access';

export type AuthContext = {
  session: SessionPayload | null;
  mcp: ReturnType<typeof parseMcpBearerToken> | null;
  isAuthenticated: boolean;
  /** 浏览器 Session 有效但已超过 docsAuth 复检窗口 */
  sessionNeedsReauth: boolean;
};

export function resolveAuthContext(request: Request): AuthContext {
  if (!isCubeSsoEnabled()) {
    return { session: null, mcp: null, isAuthenticated: true, sessionNeedsReauth: false };
  }

  const aud = mcpResourceUrlsForRequest(request);
  const cookieHeader = request.headers.get('cookie');
  const session = readSessionFromCookieHeader(cookieHeader);
  const bearer = extractBearerToken(request);
  const mcp = parseMcpBearerToken(bearer, aud);

  const sessionReauth = Boolean(session && sessionNeedsReauth(session));
  const sessionOk = Boolean(session && !sessionReauth);

  return {
    session,
    mcp,
    isAuthenticated: Boolean(sessionOk || mcp),
    sessionNeedsReauth: sessionReauth,
  };
}

export { parseSessionToken, readSessionFromCookieHeader, shouldRefreshSession } from '@/lib/auth/session';

/** proxy 层轻量鉴权（不读 secrets.json / fs） */
export function isGateAuthenticated(request: NextRequest | Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  const session = readSessionFromCookieHeader(cookieHeader);
  if (session) {
    if (sessionNeedsReauth(session)) return false;
    return true;
  }

  const bearer = extractBearerToken(request);
  if (!bearer) return false;

  const aud = mcpResourceUrlsForRequest(request);
  return Boolean(parseMcpBearerTokenLite(bearer, aud));
}

export function gateSsoActive(): boolean {
  return isCubeSsoEnabled();
}

function clearCookieHeader(name: string, request: Request): string {
  const secure = isSecureCookieRequest(request);
  return [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** 清除文档站 SSO / MCP / 私有访问相关 Cookie。 */
export function appendClearAuthSessionCookies(headers: Headers, request: Request): void {
  headers.append('Set-Cookie', clearCookieHeader(DOCS_SESSION_COOKIE, request));
  headers.append('Set-Cookie', clearCookieHeader(DOCS_CUBE_USER_COOKIE, request));
  headers.append('Set-Cookie', clearMcpTokenCookieHeader(request));
  headers.append('Set-Cookie', clearCookieHeader(DOCS_CUBE_ORIGIN_COOKIE, request));
  headers.append('Set-Cookie', clearCookieHeader(PRIVATE_DOC_COOKIE, request));
}

/**
 * 登出后跳转目标：
 * - 站内相对路径（默认 `/auth/login`）
 * - 或通过 `DOCS_CUBE_ORIGIN_PATTERN` 校验的魔方绝对 URL（供魔方 logout 回跳）
 */
export function safeLogoutRedirect(input: string | null | undefined): string {
  const fallback = '/auth/login';
  if (!input || typeof input !== 'string') return fallback;

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    const path = safeRedirectPath(trimmed);
    return path === '/' ? fallback : path;
  }

  try {
    const url = new URL(trimmed);
    const origin = `${url.protocol}//${url.host}`;
    if (isValidCubeOrigin(origin)) return url.toString();
  } catch {
    /* ignore */
  }

  return fallback;
}

export { sessionNeedsSilentRefresh };
