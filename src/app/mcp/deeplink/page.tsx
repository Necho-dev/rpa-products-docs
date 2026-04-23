import { headers } from 'next/headers';
import { isPrivateDocAccessConfigured } from '@/lib/doc-access';
import { inferSiteOrigin } from '@/lib/site-origin';
import { McpDeeplinkClient } from './client';

export default async function McpDeeplinkPage() {
  const hdrs = await headers();
  // Build a minimal Request-like object to reuse inferSiteOrigin
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const origin = inferSiteOrigin(
    new Request(`${proto}://${host}/mcp/deeplink`, { headers: Object.fromEntries(hdrs.entries()) }),
  );
  const mcpUrl = `${origin}/mcp`;

  return (
    <McpDeeplinkClient
      mcpUrl={mcpUrl}
      privateDocsAccessEnabled={isPrivateDocAccessConfigured()}
    />
  );
}
