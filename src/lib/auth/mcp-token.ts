import {
  isSecureCookieRequest,
  mcpTokenTtlSec,
  sessionSecret,
} from '@/lib/auth/auth-config';
import { DOCS_MCP_TOKEN_COOKIE } from '@/lib/auth/cookie-names';
import { isKnownSecretHash } from '@/lib/auth/cube';
import { mcpAudMatches } from '@/lib/core/site-origin';
import { dumpsTimed, loadsTimed, timedTokenExpiresAtSec } from '@/lib/auth/timed-serializer';

const MCP_TOKEN_SALT = 'docs-mcp-token';

export type McpTokenPayload = {
  u: string;
  s: string;
  aud: string;
  t: number;
};

function asMcpPayload(raw: Record<string, unknown>): McpTokenPayload | null {
  const u = raw.u;
  const s = raw.s;
  const aud = raw.aud;
  const t = raw.t;
  if (typeof u !== 'string' || !u) return null;
  if (typeof s !== 'string' || !s) return null;
  if (typeof aud !== 'string' || !aud) return null;
  if (typeof t !== 'number' || !Number.isFinite(t)) return null;
  return { u, s, aud, t };
}

export function issueMcpToken(payload: Pick<McpTokenPayload, 'u' | 's' | 'aud'>): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('DOCS_SESSION_SECRET is not configured');
  const now = Math.floor(Date.now() / 1000);
  return dumpsTimed(secret, { ...payload, t: now }, MCP_TOKEN_SALT);
}

export function parseMcpBearerToken(
  token: string | undefined | null,
  expectedAud: string | readonly string[],
): McpTokenPayload | null {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const raw = loadsTimed(secret, token, mcpTokenTtlSec(), MCP_TOKEN_SALT);
  if (!raw) return null;
  const payload = asMcpPayload(raw);
  if (!payload) return null;
  if (!mcpAudMatches(payload.aud, expectedAud)) return null;
  if (!isKnownSecretHash(payload.s)) return null;
  return payload;
}

/** proxy 门禁：验签 + aud，不读 secrets.json */
export function parseMcpBearerTokenLite(
  token: string | undefined | null,
  expectedAud: string | readonly string[],
): McpTokenPayload | null {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const raw = loadsTimed(secret, token, mcpTokenTtlSec(), MCP_TOKEN_SALT);
  if (!raw) return null;
  const payload = asMcpPayload(raw);
  if (!payload) return null;
  if (!mcpAudMatches(payload.aud, expectedAud)) return null;
  return payload;
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const scheme = 'Bearer ';
  if (!header.startsWith(scheme)) return null;
  const value = header.slice(scheme.length).trim();
  return value || null;
}

export function readMcpTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${DOCS_MCP_TOKEN_COOKIE}=([^;]*)`),
  );
  const raw = match?.[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function readMcpTokenFromRequest(request: Request): string | null {
  return readMcpTokenFromCookieHeader(request.headers.get('cookie'));
}

export function mcpTokenCookieHeader(
  token: string,
  request: Request,
  maxAgeSec: number = mcpTokenTtlSec(),
): string {
  const secure = isSecureCookieRequest(request);
  return [
    `${DOCS_MCP_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, maxAgeSec)}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearMcpTokenCookieHeader(request: Request): string {
  const secure = isSecureCookieRequest(request);
  return [
    `${DOCS_MCP_TOKEN_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function mcpTokenMatchesSession(
  token: string,
  session: Pick<McpTokenPayload, 'u' | 's'>,
  expectedAud: string | readonly string[],
): McpTokenPayload | null {
  const payload = parseMcpBearerToken(token, expectedAud);
  if (!payload) return null;
  if (payload.u !== session.u || payload.s !== session.s) return null;
  return payload;
}

export type ResolvedMcpToken = {
  token: string;
  expiresAt: number;
  reused: boolean;
};

/** 同一 session（u+s+aud）在 TTL 内复用 Cookie 中的 Token，避免重复签发。 */
export function resolveMcpTokenForSession(
  request: Request,
  session: Pick<McpTokenPayload, 'u' | 's'>,
  expectedAud: string | readonly string[],
  resourceAud: string,
  options: { force?: boolean } = {},
): ResolvedMcpToken {
  const ttl = mcpTokenTtlSec();
  const now = Math.floor(Date.now() / 1000);

  if (!options.force) {
    const cached = readMcpTokenFromRequest(request);
    if (cached && mcpTokenMatchesSession(cached, session, expectedAud)) {
      const expiresAt = timedTokenExpiresAtSec(cached, ttl);
      if (expiresAt && expiresAt > now) {
        return { token: cached, expiresAt, reused: true };
      }
    }
  }

  const token = issueMcpToken({ u: session.u, s: session.s, aud: resourceAud });
  const expiresAt = timedTokenExpiresAtSec(token, ttl) ?? now + ttl;
  return { token, expiresAt, reused: false };
}

export function appendMcpTokenCookie(
  headers: Headers,
  request: Request,
  token: string,
  expiresAtSec: number,
): void {
  const remaining = expiresAtSec - Math.floor(Date.now() / 1000);
  headers.append('Set-Cookie', mcpTokenCookieHeader(token, request, remaining));
}
