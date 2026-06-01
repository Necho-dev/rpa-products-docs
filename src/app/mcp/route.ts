import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { createDocsMcpServer } from '@/server/mcp/docs-mcp-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streamable HTTP: `handleRequest` resolves as soon as a Response exists. For SSE bodies,
 * our previous `finally { transport.close() }` ran immediately and tore down the stream
 * before any bytes reached the client → Cursor timed out (-32001) then failed SSE fallback.
 *
 * - POST: `enableJsonResponse` — wait for full JSON-RPC result(s) before resolving.
 * - GET: 405 — no long-lived SSE; client continues POST-only (see StreamableHTTPClientTransport).
 */
async function mcpPost(request: Request): Promise<Response> {
  const access = getDocAccessContext(request);
  if (isCubeSsoEnabled() && !access.canAccessPrivate) {
    const origin = inferSiteOrigin(request);
    return Response.json(
      {
        error: 'unauthorized',
        message: '请在文档站登录后访问 /mcp/deeplink 重新获取 MCP Bearer',
        deeplink: `${origin}/mcp/deeplink`,
      },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer realm="mcp"' },
      },
    );
  }

  const origin = inferSiteOrigin(request);
  const mcp = createDocsMcpServer(origin, access);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await mcp.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close().catch(() => {});
    await mcp.close().catch(() => {});
  }
}

export function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: 'POST, DELETE' },
  });
}

export function POST(request: Request) {
  return mcpPost(request);
}

export function DELETE(request: Request) {
  return mcpPost(request);
}
