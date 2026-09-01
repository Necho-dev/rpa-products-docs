import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  buildListPagesToolDescription,
  listDocumentationPages,
} from '@/lib/docs/docs-site-tools';
import type { SearchTag } from '@/lib/docs/search/search-tags';
import { docsRoute } from '@/lib/core/shared';

export function registerListDocsTool(
  server: McpServer,
  siteOrigin: string,
  access: DocAccessContext,
  searchTags: SearchTag[] = [],
): void {
  const tagValues = searchTags.map((t) => t.value);
  const tagDescribe =
    tagValues.length > 0
      ? `Optional documentation partition slug. Allowed: ${tagValues
          .map((v) => {
            const label = searchTags.find((t) => t.value === v)?.label ?? v;
            return `"${v}" (${label})`;
          })
          .join(', ')}.`
      : 'Optional documentation partition slug (first URL segment under /docs).';

  server.registerTool(
    'list_docs',
    {
      description: buildListPagesToolDescription(searchTags),
      inputSchema: {
        locale: z
          .string()
          .optional()
          .describe('When the site uses i18n, filter by language code (e.g. "en"). Otherwise ignored.'),
        tag: z.string().optional().describe(tagDescribe),
        prefix: z
          .string()
          .optional()
          .describe(
            `Optional docs path prefix (e.g. "${docsRoute}/rpa/RPA_QIANNIU"). Returns that page and its descendants.`,
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ locale, tag, prefix }) => {
      const r = await listDocumentationPages(siteOrigin, locale, access, { tag, prefix });
      return {
        content: [{ type: 'text', text: r.text }],
        ...(r.ok ? {} : { isError: true }),
      };
    },
  );
}
