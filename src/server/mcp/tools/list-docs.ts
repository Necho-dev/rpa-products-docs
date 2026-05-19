import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { listDocumentationPages, listPagesToolDescription } from '@/lib/docs/docs-site-tools';

export function registerListDocsTool(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
): void {
  server.registerTool(
    'list_docs',
    {
      description: listPagesToolDescription,
      inputSchema: {
        locale: z
          .string()
          .optional()
          .describe('When the site uses i18n, filter by language code (e.g. "en"). Otherwise ignored.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ locale }) => {
      const r = await listDocumentationPages(siteOrigin, locale, access);
      return {
        content: [{ type: 'text', text: r.text }],
        ...(r.ok ? {} : { isError: true }),
      };
    },
  );
}
