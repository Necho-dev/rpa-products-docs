import { oauthAuthorizationServerMetadata } from '@/lib/mcp-public-oauth';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json(oauthAuthorizationServerMetadata(origin), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
