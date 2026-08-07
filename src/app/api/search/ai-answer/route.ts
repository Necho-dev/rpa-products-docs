import { stepCountIs, streamText, tool } from 'ai';
import { getLlmModel } from '@/lib/ai/llm';
import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import {
  checkAiSearchRateLimit,
  resolveAiSearchRateLimitKey,
} from '@/lib/docs/search/ai-search-rate-limit';
import {
  getDocumentationPage,
  getPageToolDescription,
  GetDocumentationPageInputSchema,
} from '@/lib/docs/docs-site-tools';
import { isSentryEnabled } from '@/lib/observability/sentry';

export const runtime = 'nodejs';

const AI_ANSWER_TIMEOUT_MS = (() => {
  const raw = process.env.AI_ANSWER_TIMEOUT_MS?.trim();
  if (!raw) return 30_000;
  const ms = Number.parseInt(raw, 10);
  return Number.isFinite(ms) && ms >= 5_000 ? ms : 30_000;
})();

/** LLM 最多调用工具的步数（搜索结果已给出 URL，通常 2-3 次工具调用即可覆盖多篇文档） */
const MAX_STEPS = 5;
/** 传入 LLM 的候选文档 URL 数上限（上下文参考，非强制读取） */
const MAX_CANDIDATE_DOCS = 8;

const ANSWER_SYSTEM_PROMPT = `You are a concise answer assistant for an internal RPA documentation site.

The user has just performed a search and received a list of potentially relevant document URLs. Your job is to answer the user's question accurately based on the actual documentation content.

Workflow:
1. Read the candidate document URLs provided.
2. Call getDocumentationPage for the most relevant URL(s). For complex questions, read 2-3 documents to gather complete information.
3. Synthesize the content from all fetched documents into one coherent answer in 简体中文.
4. If a document doesn't contain useful information, move on to the next candidate.

Rules:
- Use the getDocumentationPage tool to fetch real content — do not guess or invent answers.
- IMPORTANT: When the answer likely spans multiple documents (e.g. multi-step procedures, different platforms), proactively read 2-3 relevant candidates instead of stopping at the first one.
- If none of the documents contain the answer, say so honestly and suggest the user open the linked pages.
- Use numbered steps for procedures, bullet points for lists.
- Keep the answer concise (aim under 400 characters for simple answers; up to ~800 for multi-step / multi-source answers).
- IMPORTANT: When citing a document, use a Markdown hyperlink: [《文档标题》](full_url). Use the exact full URL from the candidate list (including the site origin). Example: [《RPA · 账密托管 · 拼多多商家后台》](https://example.com/docs/rpa/...).
- If synthesizing from multiple documents, cite each relevant source with its hyperlink.
- Do not repeat the user's question.
- Respond in 简体中文 only. Do not output raw JSON or tool calls to the user.`;

type DocCandidate = {
  url: string;
  breadcrumbs?: string[];
};

type AiAnswerRequestBody = {
  query?: unknown;
  intent?: unknown;
  docs?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.LLM_API_KEY?.trim()) {
    return Response.json({ error: 'ai_unavailable' }, { status: 503 });
  }

  const access = getDocAccessContext(request);
  const siteOrigin = inferSiteOrigin(request);

  const rateLimitKey = resolveAiSearchRateLimitKey(request, access);
  const rateLimit = checkAiSearchRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
    );
  }

  let body: AiAnswerRequestBody;
  try {
    body = (await request.json()) as AiAnswerRequestBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const intent = typeof body.intent === 'string' ? body.intent : '';

  if (!query || query.length < 2) {
    return Response.json({ error: 'query_too_short' }, { status: 400 });
  }

  // 仅 howto intent 生成回答
  if (intent !== 'howto') {
    return Response.json({ error: 'intent_not_supported' }, { status: 400 });
  }

  const rawDocs = Array.isArray(body.docs) ? (body.docs as unknown[]) : [];
  const candidates: DocCandidate[] = rawDocs
    .filter((d): d is DocCandidate => typeof d === 'object' && d !== null && typeof (d as DocCandidate).url === 'string')
    .slice(0, MAX_CANDIDATE_DOCS);

  if (candidates.length === 0) {
    return Response.json({ error: 'no_docs' }, { status: 400 });
  }

  // 候选文档列表拼入 prompt，LLM 自主决定读哪些
  const candidateBlock = candidates
    .map((d, i) => {
      const crumbs = d.breadcrumbs ?? [];
      const title = crumbs.length > 0 ? crumbs.join(' · ') : d.url;
      const fullUrl = `${siteOrigin}${d.url}`;
      return `${i + 1}. title="${title}" url="${fullUrl}"`;
    })
    .join('\n');

  const userPrompt = `用户问题：${query}

候选文档（已按相关性排序，请使用 url 字段调用工具并构造引用链接）：
${candidateBlock}

请调用 getDocumentationPage 工具读取最相关的 1-3 篇文档内容，综合后回答用户的问题。引用时使用 Markdown 链接格式：[《title》](url)。`;

  const result = streamText({
    model: getLlmModel(),
    experimental_telemetry: {
      isEnabled: isSentryEnabled(),
      functionId: 'docs-ai-answer',
      recordInputs: true,
      recordOutputs: true,
    },
    system: ANSWER_SYSTEM_PROMPT,
    prompt: userPrompt,
    tools: {
      getDocumentationPage: tool({
        description: getPageToolDescription,
        inputSchema: GetDocumentationPageInputSchema,
        execute: async ({ path }) => {
          const r = await getDocumentationPage(siteOrigin, path, access);
          return r.text;
        },
      }),
    },
    toolChoice: 'auto',
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: 1000,
    abortSignal: AbortSignal.timeout(AI_ANSWER_TIMEOUT_MS),
  });

  return result.toTextStreamResponse({
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
