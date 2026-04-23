import { oauthProtectedResourceMetadata } from '@/lib/mcp-public-oauth';

export const dynamic = 'force-dynamic';

/** Fallback when clients only probe root PRM after path-specific discovery. */
export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json(oauthProtectedResourceMetadata(origin), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
