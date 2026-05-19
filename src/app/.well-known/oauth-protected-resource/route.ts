import { oauthProtectedResourceMetadata } from '@/lib/auth/mcp-public-oauth';
import { inferSiteOrigin } from '@/lib/core/site-origin';

export const dynamic = 'force-dynamic';

/** Fallback when clients only probe root PRM after path-specific discovery. */
export function GET(request: Request) {
  const origin = inferSiteOrigin(request);
  return Response.json(oauthProtectedResourceMetadata(origin), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
