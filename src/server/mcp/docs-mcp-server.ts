import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  buildMcpServerInstructions,
  getMcpServerName,
  getMcpServerVersion,
} from '@/lib/agent/mcp-config';
import { getSearchTags } from '@/lib/docs/search/search-tags';
import { registerDocsMcpTools } from '@/server/mcp/tools';

export function createDocsMcpServer(siteOrigin: string, access: DocAccessContext): McpServer {
  const searchTags = getSearchTags();
  const server = new McpServer(
    {
      name: getMcpServerName(),
      version: getMcpServerVersion(),
    },
    {
      capabilities: { tools: {} },
      instructions: buildMcpServerInstructions(siteOrigin, searchTags),
    },
  );

  registerDocsMcpTools(server, siteOrigin, access, searchTags);

  return server;
}
