import { resolveAuthContext } from '@/lib/auth/auth-core';
import { appendSessionCookie } from '@/lib/auth/session';
import { mcpResourceUrl } from '@/lib/auth/auth-config';
import {
  appendMcpTokenCookie,
  resolveMcpTokenForSession,
} from '@/lib/auth/mcp-token';
import { inferSiteOrigin, mcpResourceUrlsForRequest } from '@/lib/core/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const ctx = resolveAuthContext(request);
  if (!ctx.session || ctx.sessionNeedsReauth) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';

  const origin = inferSiteOrigin(request);
  const resource = mcpResourceUrl(origin);
  const audCandidates = mcpResourceUrlsForRequest(request);
  const now = Math.floor(Date.now() / 1000);

  const resolved = resolveMcpTokenForSession(
    request,
    ctx.session,
    audCandidates,
    resource,
    { force },
  );

  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  appendSessionCookie(headers, request, {
    u: ctx.session.u,
    s: ctx.session.s,
    iat: ctx.session.iat,
  });
  appendMcpTokenCookie(headers, request, resolved.token, resolved.expiresAt);

  return Response.json(
    {
      token: resolved.token,
      tokenType: 'Bearer',
      authorization: `Bearer ${resolved.token}`,
      resource,
      expiresIn: Math.max(0, resolved.expiresAt - now),
      expiresAt: resolved.expiresAt,
      reused: resolved.reused,
    },
    { headers },
  );
}
