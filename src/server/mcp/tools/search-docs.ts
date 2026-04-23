import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/doc-access';
import { searchDocumentation, searchDocsToolDescription } from '@/lib/docs-site-tools';

export function registerSearchDocsTool(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
): void {
  server.registerTool(
    'search-docs',
    {
      description: searchDocsToolDescription,
      inputSchema: {
        query: z.string().min(2).describe('Search query (natural language or keywords).'),
        locale: z.string().optional().describe('Optional locale when the site uses i18n.'),
        limit: z
          .coerce.number()
          .int()
          .min(1)
          .max(25)
          .optional()
          .describe('Max results (default 15, max 25).'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, locale, limit }) => {
      const r = await searchDocumentation(siteOrigin, query, { locale, limit }, access);
      return {
        content: [{ type: 'text', text: r.text }],
        ...(r.ok ? {} : { isError: true }),
      };
    },
  );
}
