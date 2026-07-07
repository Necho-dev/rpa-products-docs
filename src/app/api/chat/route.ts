import { ProvideLinksToolSchema } from '@/lib/ai/inkeep-qa-schema';
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
} from '@/lib/docs/docs-site-tools';
import {
  AddExcerptInputSchema,
  addExcerptToolDescription,
  DeleteExcerptInputSchema,
  deleteExcerptToolDescription,
  ListExcerptsInputSchema,
  listExcerptsToolDescription,
  SearchExcerptsInputSchema,
  searchExcerptsToolDescription,
} from '@/lib/docs/selection/excerpt-ai-tools';
import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { createLlmProvider } from '@/lib/ai/llm';
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import { docsRoute } from '@/lib/core/shared';
import type { InkeepUIMessage } from '@/lib/ai/chat-types';

export type { InkeepUIMessage };

const openai = createLlmProvider();

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
When Client Context includes a selection field, prioritize answering about that selected excerpt while using documentation tools if needed for broader context.
Prefer searchDocumentationPages when the user is vague or keyword-driven; use listDocumentationPages to browse the full catalog; use getDocumentationPageMeta before getDocumentationPage when you only need headings/TOC; use getDocumentationPage for full body text.

Excerpt tools (listExcerpts, searchExcerpts, addExcerpt, deleteExcerpt) run in the user's browser against local IndexedDB — use them when the user asks about their saved highlights/excerpts collection. They do NOT bypass document access control; they only read or write local highlights for pages the user can open.
For addExcerpt, prefer the user's current selection from Client Context when present; otherwise use tool parameters and the current page path from Client Context location. deleteExcerpt requires explicit user confirmation in the UI — do not assume deletion succeeded until tool output confirms it.

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
        execute: async ({ query, locale, limit, scope }) => {
          const r = await searchDocumentation(siteOrigin, query, { locale, limit, scope }, access);
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
      listExcerpts: tool({
        description: listExcerptsToolDescription,
        inputSchema: ListExcerptsInputSchema,
      }),
      searchExcerpts: tool({
        description: searchExcerptsToolDescription,
        inputSchema: SearchExcerptsInputSchema,
      }),
      addExcerpt: tool({
        description: addExcerptToolDescription,
        inputSchema: AddExcerptInputSchema,
      }),
      deleteExcerpt: tool({
        description: deleteExcerptToolDescription,
        inputSchema: DeleteExcerptInputSchema,
        needsApproval: true,
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
