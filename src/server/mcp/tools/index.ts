import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import type { SearchTag } from '@/lib/docs/search/search-tags';
import { registerGetDocsContentTool } from './get-docs-content';
import { registerGetDocsMetaTool } from './get-docs-meta';
import { registerListDocsTool } from './list-docs';
import { registerSearchDocsTool } from './search-docs';

/** 注册本站文档相关 MCP 工具（只读、可安全暴露给 IDE / Agent） */
export function registerDocsMcpTools(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
  searchTags: SearchTag[] = [],
): void {
  registerListDocsTool(server, siteOrigin, access);
  registerSearchDocsTool(server, siteOrigin, access, searchTags);
  registerGetDocsMetaTool(server, siteOrigin, access);
  registerGetDocsContentTool(server, siteOrigin, access);
}
