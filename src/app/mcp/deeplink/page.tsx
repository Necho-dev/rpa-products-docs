import { headers } from 'next/headers';
import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { isPrivateDocAccessConfigured } from '@/lib/docs/access/doc-access';
import { getMcpDisplayName } from '@/lib/agent/mcp-config';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { McpDeeplinkClient } from './client';

export default async function McpDeeplinkPage() {
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const origin = inferSiteOrigin(
    new Request(`${proto}://${host}/mcp/deeplink`, { headers: Object.fromEntries(hdrs.entries()) }),
  );
  const mcpUrl = `${origin}/mcp`;

  return (
    <McpDeeplinkClient
      mcpUrl={mcpUrl}
      mcpDisplayName={getMcpDisplayName()}
      privateDocsAccessEnabled={isPrivateDocAccessConfigured()}
      cubeSsoEnabled={isCubeSsoEnabled()}
    />
  );
}
