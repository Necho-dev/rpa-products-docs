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
  buildListPagesToolDescription,
  SearchDocumentationInputSchema,
  searchDocumentation,
  buildSearchDocsToolDescription,
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
import {
  OpenDocumentationPageInputSchema,
  openDocumentationPageToolDescription,
} from '@/lib/docs/open-doc-ai-tools';
import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { createLlmProvider } from '@/lib/ai/llm';
import { getSearchTags } from '@/lib/docs/search/search-tags';
import { isSentryEnabled } from '@/lib/observability/sentry';
import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, tool } from 'ai';
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
  const searchTags = getSearchTags();
  const searchDocsDescription = buildSearchDocsToolDescription(searchTags);
  const listPagesDescription = buildListPagesToolDescription(searchTags);

  const result = streamText({
    model: openai(process.env.LLM_MODEL ?? ''),
    experimental_telemetry: {
      isEnabled: isSentryEnabled(),
      functionId: 'docs-chat',
      recordInputs: true,
      recordOutputs: true,
    },
    system: `You are a helpful assistant for this documentation site. The docs live under ${docsRoute}.
When the user asks about documentation, topics, connectors, apps, or anything that may be covered in the site docs, you MUST use the documentation tools to read real catalog, search hits, or page content — do not guess paths or invent content.
Client Context describes the user's current docs view. location is the browser URL of the left/main page. layout "single" means one document (left). layout "split" means desktop dual-pane: left is the main article, right is the peeked article. layout "sheet" means the right document is a mobile overlay on top of left. left/right objects include path, title, and url. When the user says 这篇 / 左边 / 右边 / 当前打开的 / 右栏, map to the corresponding pane and prefer getDocumentationPage with that pane's path. If ambiguous, consider both panes and say which one you used.
When Client Context includes a selection field, prioritize answering about that selected excerpt while using documentation tools if needed for broader context.
Prefer searchDocumentationPages when the user is vague or keyword-driven; use listDocumentationPages with tag and/or prefix to browse a partition or path prefix (do not dump the full catalog unless asked); use getDocumentationPageMeta before getDocumentationPage when you only need headings, TOC, entry/badge, schedule fields (dataReady / estimatedDuration / minInterval), or prerequisites (references, kind=dependency is 前置依赖); use getDocumentationPage for full body text.

openDocumentationPage runs in the user's browser and requires explicit confirmation — it may open a right-pane preview or navigate away. Use it only when the user asks to open/jump to a page. Prefer target=peek. Do not use it to read content.

Excerpt tools (listExcerpts, searchExcerpts, addExcerpt, deleteExcerpt) run in the user's browser against local IndexedDB — use them when the user asks about their saved highlights/excerpts collection. They do NOT bypass document access control; they only read or write local highlights for pages the user can open.
For addExcerpt, prefer the user's current selection from Client Context when present; otherwise use tool parameters and the current page path from Client Context location. deleteExcerpt requires explicit user confirmation in the UI — do not assume deletion succeeded until tool output confirms it.

After every tool call, you MUST continue and write a clear reply in the same language as the user (e.g. 简体中文), summarizing what you found — do not end the turn with only tool output; the user cannot see raw tool JSON as the final answer.`,
    stopWhen: stepCountIs(16),
    tools: {
      provideLinks: {
        inputSchema: ProvideLinksToolSchema,
      },
      listDocumentationPages: tool({
        description: listPagesDescription,
        inputSchema: ListDocumentationPagesInputSchema,
        execute: async ({ locale, tag, prefix }) => {
          const r = await listDocumentationPages(siteOrigin, locale, access, { tag, prefix });
          return r.text;
        },
      }),
      searchDocumentationPages: tool({
        description: searchDocsDescription,
        inputSchema: SearchDocumentationInputSchema,
        execute: async ({ query, locale, limit, scope, tag }) => {
          const r = await searchDocumentation(
            siteOrigin,
            query,
            { locale, limit, scope, tag },
            access,
          );
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
      openDocumentationPage: tool({
        description: openDocumentationPageToolDescription,
        inputSchema: OpenDocumentationPageInputSchema,
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

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream({
      messageMetadata: ({ part }) => {
        if (part.type === 'finish') {
          return { createdAt: Date.now() };
        }
      },
    }),
  });
}
