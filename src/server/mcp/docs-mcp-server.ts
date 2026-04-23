import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DocAccessContext } from '@/lib/doc-access';
import { docsRoute } from '@/lib/shared';
import { registerDocsMcpTools } from '@/server/mcp/tools';

export function createDocsMcpServer(siteOrigin: string, access: DocAccessContext): McpServer {
  const server = new McpServer(
    {
      name: 'fumadocs-site',
      version: '1.1.0',
    },
    {
      capabilities: { tools: {} },
      instructions: `This MCP server exposes this site's Fumadocs documentation. Base docs path: ${docsRoute}.

Tools:
- list-pages — catalog all pages (paths, titles, descriptions).
- search-docs — full-text search when the user does not know an exact path.
- get-page-meta — title, description, URL, and TOC without full body (saves tokens).
- get-page — full page content for a known path.

Typical flow: search-docs or list-pages → get-page-meta (optional) → get-page.`,
    },
  );

  registerDocsMcpTools(server, siteOrigin, access);

  return server;
}
