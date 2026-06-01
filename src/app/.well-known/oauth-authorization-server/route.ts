import {
  isMcpPublicOAuthStubEnabled,
  oauthAuthorizationServerMetadata,
} from '@/lib/auth/mcp-public-oauth';
import { inferSiteOrigin } from '@/lib/core/site-origin';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  if (!isMcpPublicOAuthStubEnabled()) {
    return new Response(null, { status: 404 });
  }

  const origin = inferSiteOrigin(request);
  return Response.json(oauthAuthorizationServerMetadata(origin), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
