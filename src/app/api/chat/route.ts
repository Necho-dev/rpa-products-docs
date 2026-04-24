import { ProvideLinksToolSchema } from '../../../lib/ai/inkeep-qa-schema';
import {
  GetDocumentationPageInputSchema,
  GetDocumentationPageMetaInputSchema,
  getDocumentationPage,
  getDocumentationPageMeta,
  getPageMetaToolDescription,
  getPageToolDescription,
  ListDocumentationPagesInputSchema,
  listDocumentationPages,
  listPagesToolDescription,
  SearchDocumentationInputSchema,
  searchDocumentation,
  searchDocsToolDescription,
} from '@/lib/docs-site-tools';
import { getDocAccessContext } from '@/lib/doc-access';
import { inferSiteOrigin } from '@/lib/site-origin';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import { docsRoute } from '@/lib/shared';
import type { InkeepUIMessage } from '@/lib/ai-chat-types';

export type { InkeepUIMessage };

const openai = createOpenAICompatible({
  name: 'inkeep',
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL ?? '',
});

export async function POST(req: Request, _ctx: RouteContext<"/api/chat">) {
  let reqJson: unknown;
  try {
    reqJson = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求体格式无效，需要 JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    !reqJson ||
    typeof reqJson !== 'object' ||
    !Array.isArray((reqJson as Record<string, unknown>).messages)
  ) {
    return new Response(JSON.stringify({ error: '缺少必要字段：messages' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const siteOrigin = inferSiteOrigin(req);
  const access = getDocAccessContext(req);

  const result = streamText({
    model: openai(process.env.LLM_MODEL ?? ''),
    system: `You are a helpful assistant for this documentation site. The docs live under ${docsRoute}.
When the user asks about documentation, topics, connectors, apps, or anything that may be covered in the site docs, you MUST use the documentation tools to read real catalog, search hits, or page content — do not guess paths or invent content.
Prefer searchDocumentationPages when the user is vague or keyword-driven; use listDocumentationPages to browse the full catalog; use getDocumentationPageMeta before getDocumentationPage when you only need headings/TOC; use getDocumentationPage for full body text.

After every tool call, you MUST continue and write a clear reply in the same language as the user (e.g. 简体中文), summarizing what you found — do not end the turn with only tool output; the user cannot see raw tool JSON as the final answer.`,
    stopWhen: stepCountIs(16),
    tools: {
      provideLinks: {
        inputSchema: ProvideLinksToolSchema,
      },
      listDocumentationPages: tool({
        description: listPagesToolDescription,
        inputSchema: ListDocumentationPagesInputSchema,
        execute: async ({ locale }) => {
          const r = await listDocumentationPages(siteOrigin, locale, access);
          return r.text;
        },
      }),
      searchDocumentationPages: tool({
        description: searchDocsToolDescription,
        inputSchema: SearchDocumentationInputSchema,
        execute: async ({ query, locale, limit }) => {
          const r = await searchDocumentation(siteOrigin, query, { locale, limit }, access);
          return r.text;
        },
      }),
      getDocumentationPageMeta: tool({
        description: getPageMetaToolDescription,
        inputSchema: GetDocumentationPageMetaInputSchema,
        execute: async ({ path }) => {
          const r = await getDocumentationPageMeta(siteOrigin, path, access);
          return r.text;
        },
      }),
      getDocumentationPage: tool({
        description: getPageToolDescription,
        inputSchema: GetDocumentationPageInputSchema,
        execute: async ({ path }) => {
          const r = await getDocumentationPage(siteOrigin, path, access);
          return r.text;
        },
      }),
    },
    messages: await convertToModelMessages<InkeepUIMessage>((reqJson as { messages: InkeepUIMessage[] }).messages, {
      ignoreIncompleteToolCalls: true,
      convertDataPart(part) {
        if (part.type === 'data-client')
          return {
            type: 'text',
            text: `[Client Context: ${JSON.stringify(part.data)}]`,
          };
      },
    }),
    toolChoice: 'auto',
  });

  return result.toUIMessageStreamResponse();
}
