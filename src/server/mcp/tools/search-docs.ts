import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  buildSearchDocsToolDescription,
  searchDocumentation,
} from '@/lib/docs/docs-site-tools';
import type { SearchTag } from '@/lib/docs/search/search-tags';

export function registerSearchDocsTool(
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
    'search_docs',
    {
      description: buildSearchDocsToolDescription(searchTags),
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
        scope: z
          .enum(['full', 'page'])
          .optional()
          .describe(
            "Result granularity: 'full' (default) includes matching headings/text snippets; 'page' returns at most one result per document (use when you only need to know which documents match).",
          ),
        tag: z.string().optional().describe(tagDescribe),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, locale, limit, scope, tag }) => {
      const r = await searchDocumentation(
        siteOrigin,
        query,
        { locale, limit, scope, tag },
        access,
      );
      return {
        content: [{ type: 'text', text: r.text }],
        ...(r.ok ? {} : { isError: true }),
      };
    },
  );
}
