import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { getDocumentationPage, getPageToolDescription } from '@/lib/docs/docs-site-tools';
import { docsRoute } from '@/lib/core/shared';

const getDocsContentToolDescription = `${getPageToolDescription}
Image src values are content/docs-relative paths — use get_docs_image(path, page=this page path) to fetch binaries.`;

export function registerGetDocsContentTool(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
): void {
  server.registerTool(
    'get_docs_content',
    {
      description: getDocsContentToolDescription,
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
