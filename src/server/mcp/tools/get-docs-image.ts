import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  isDocPageAccessible,
  resolveDocPage,
} from '@/lib/docs/docs-site-tools';
import { authorizeMcpDocsImageAccess } from '@/lib/docs/resources/mcp-docs-image-access';
import { readDocsImageFile } from '@/lib/docs/resources/read-docs-image';
import { docsRoute } from '@/lib/core/shared';

export const getDocsImageToolDescription = `Fetches a documentation image binary for vision / inspection.

WHEN TO USE: After get_docs_content, when content references a content/docs-relative image path (e.g. \`rpa/_public/images/foo.png\`).

Access: SSO is enforced at /mcp. With legacy PRIVATE_ACCESS_TOKEN and no Authorization, you may only fetch images from pages you can read — pass page= (same docs path as get_docs_content).

Accepts a path relative to content/docs (also accepts legacy \`/resources/images/...\` URLs).
Returns MCP image content (base64 + mimeType). Max size 8MB.`;

export function registerGetDocsImageTool(
  server: McpServer,
  access: DocAccessContext,
): void {
  server.registerTool(
    'get_docs_image',
    {
      description: getDocsImageToolDescription,
      inputSchema: {
        path: z
          .string()
          .describe(
            'Image path from get_docs_content (e.g. "rpa/_public/images/foo.png").',
          ),
        page: z
          .string()
          .optional()
          .describe(
            `Docs page path that references the image (e.g. "${docsRoute}/rpa/..."). Required without Authorization when PRIVATE_ACCESS_TOKEN mode is enabled; must be a page you can read.`,
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ path, page }) => {
      const authz = await authorizeMcpDocsImageAccess(path, access, {
        pagePath: page,
        resolvePage: (p) => {
          const hit = resolveDocPage(p);
          return hit
            ? {
                path: hit.path,
                url: hit.url,
                data: {
                  access: hit.data.access,
                  getText: (type) => hit.data.getText(type),
                },
              }
            : undefined;
        },
        isPageAccessible: (pageRef, ctx) =>
          isDocPageAccessible(
            { data: { access: pageRef.data.access }, url: pageRef.url },
            ctx,
          ),
      });

      if (!authz.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { error: authz.error, path, page: page ?? null },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const r = await readDocsImageFile(authz.relativePath);
      if (!r.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: r.error, path }, null, 2),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'image',
            data: r.data.toString('base64'),
            mimeType: r.mimeType,
          },
        ],
      };
    },
  );
}
