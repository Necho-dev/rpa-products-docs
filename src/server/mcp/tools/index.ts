import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DocAccessContext } from '@/lib/doc-access';
import { registerGetPageMetaTool } from './get-page-meta';
import { registerGetPageTool } from './get-page';
import { registerListPagesTool } from './list-pages';
import { registerSearchDocsTool } from './search-docs';

/** 注册本站文档相关 MCP 工具（只读、可安全暴露给 IDE / Agent） */
export function registerDocsMcpTools(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
): void {
  registerListPagesTool(server, siteOrigin, access);
  registerSearchDocsTool(server, siteOrigin, access);
  registerGetPageMetaTool(server, siteOrigin, access);
  registerGetPageTool(server, siteOrigin, access);
}
