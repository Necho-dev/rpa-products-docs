import { resolveAuthContext, shouldRefreshSession } from '@/lib/auth/auth-core';
import { withSessionRefresh } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const ctx = resolveAuthContext(request);
  if (!ctx.isAuthenticated) {
    return new Response('', { status: 401 });
  }

  if (ctx.session && shouldRefreshSession(ctx.session)) {
    return withSessionRefresh(new Response('', { status: 200 }), request, ctx.session);
  }

  return new Response('', { status: 200 });
}
