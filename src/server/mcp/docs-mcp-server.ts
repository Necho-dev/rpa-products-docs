import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as Sentry from '@sentry/nextjs';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  buildMcpServerInstructions,
  getMcpServerName,
  getMcpServerVersion,
} from '@/lib/agent/mcp-config';
import { getSearchTags } from '@/lib/docs/search/search-tags';
import { isSentryEnabled } from '@/lib/observability/sentry/env';
import { registerDocsMcpTools } from '@/server/mcp/tools';

export function createDocsMcpServer(siteOrigin: string, access: DocAccessContext): McpServer {
  const searchTags = getSearchTags();
  // 先 wrap 再 registerTool：Sentry AI/MCP Insights 需要 mcp.server spans
  let server = new McpServer(
    {
      name: getMcpServerName(),
      version: getMcpServerVersion(),
    },
    {
      capabilities: { tools: {} },
      instructions: buildMcpServerInstructions(siteOrigin, searchTags),
    },
  );

  if (isSentryEnabled()) {
    server = Sentry.wrapMcpServerWithSentry(server, {
      // 工具入参（query/path 等）有排查价值；正文可能很大不上报
      recordInputs: true,
      recordOutputs: false,
    });
  }

  registerDocsMcpTools(server, siteOrigin, access, searchTags);

  return server;
}
