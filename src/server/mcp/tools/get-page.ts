import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/doc-access';
import { getDocumentationPage, getPageToolDescription } from '@/lib/docs-site-tools';
import { docsRoute } from '@/lib/shared';

export function registerGetPageTool(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
): void {
  server.registerTool(
    'get-page',
    {
      description: getPageToolDescription,
      inputSchema: {
        path: z
          .string()
          .describe(
            `Docs page path or full URL (e.g. "${docsRoute}/index" or full URL ending with that path).`,
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ path }) => {
      const r = await getDocumentationPage(siteOrigin, path, access);
      return {
        content: [{ type: 'text', text: r.text }],
        ...(r.ok ? {} : { isError: true }),
      };
    },
  );
}
