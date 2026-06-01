import {
  isMcpPublicOAuthStubEnabled,
  oauthProtectedResourceMetadata,
  ssoMcpBearerResourceMetadata,
} from '@/lib/auth/mcp-public-oauth';
import { inferSiteOrigin } from '@/lib/core/site-origin';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const origin = inferSiteOrigin(request);
  const metadata = isMcpPublicOAuthStubEnabled()
    ? oauthProtectedResourceMetadata(origin)
    : ssoMcpBearerResourceMetadata(origin);
  return Response.json(metadata, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
