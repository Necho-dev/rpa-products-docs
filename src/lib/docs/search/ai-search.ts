import { APICallError } from '@ai-sdk/provider';
import { generateText } from 'ai';
import { z } from 'zod';
import { getLlmJsonModel } from '@/lib/ai/llm';
import { getSiteName } from '@/lib/core/shared';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { filterSearchHitsByDocAccess } from '@/lib/docs/docs-site-tools';
import { getDocsSearchApi } from '@/lib/docs/search/docs-search-server';
import {
  boostByPlatformScope,
  dedupeHits,
  expandHubsFromHits,
  isGroupHubUrl,
  listGroupHubTitles,
  scoreTopicHit,
  slugsDepthFromUrl,
} from '@/lib/docs/search/ai-search-catalog';
import {
  getCachedAiInterpretation,
  setCachedAiInterpretation,
} from '@/lib/docs/search/ai-search-interpret-cache';
import { rerankSearchHits } from '@/lib/docs/search/ai-search-reranker';
import { getCachedRerankResults, setCachedRerankResults } from '@/lib/docs/search/ai-search-rerank-cache';
import { getSearchTags, type SearchTag } from '@/lib/docs/search/search-tags';
import {
  mergeSearchResultsByKeyword,
  truncateSearchHitsPreservingPages,
  type SearchHitWithKeywords,
} from '@/lib/docs/search/search-utils';

// ---------------------------------------------------------------------------
// LLM 输出 Schema
// ---------------------------------------------------------------------------

const AiSearchInterpretationSchema = z.object({
  summary: z
    .string()
    .describe('一句话概括用户搜索意图，面向用户展示，使用简体中文'),
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .max(8)
    .describe(
      '用于全文检索的短关键词列表，包含同义词、缩写、中英对照等，每个词 1-6 字',
    ),
  primaryKeywords: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'keywords 中最核心的 1-3 个词，直接体现用户意图主题；其余 keywords 为辅助扩展词。primaryKeywords 必须是 keywords 的子集。',
    ),
  intent: z
    .enum(['browse', 'find', 'howto', 'compare', 'general'])
    .describe(
      'browse=浏览某平台全部文档; find=在特定平台/主题下查找连接器; howto=操作步骤/配置/如何做; compare=对比; general=其他',
    ),
  platformScope: z
    .string()
    .optional()
    .describe(
      '当用户明确指定某个平台时，填入该平台 hub 页的 URL 路径（如 /docs/rpa/RPA_QIANNIU），用于结果排序加权。不确定时省略。',
    ),
});

export type AiSearchInterpretation = z.infer<typeof AiSearchInterpretationSchema>;

export type AiSearchResponse = {
  interpretation: AiSearchInterpretation;
  results: SearchHitWithKeywords[];
};

export type AiSearchError =
  | { kind: 'unavailable' }
  | { kind: 'query_too_short' }
  | { kind: 'llm_timeout'; cause: unknown }
  | { kind: 'llm_failed'; cause: unknown };

export type AiSearchResult =
  | { ok: true; value: AiSearchResponse }
  | { ok: false; error: AiSearchError };

// ---------------------------------------------------------------------------
// 可用性
// ---------------------------------------------------------------------------

function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

export function isAiSearchAvailable(): boolean {
  return isLlmConfigured();
}

export { peekCachedAiInterpretation } from '@/lib/docs/search/ai-search-interpret-cache';

// ---------------------------------------------------------------------------
// System Prompt（动态，按分区自动生成）
// ---------------------------------------------------------------------------

function formatPartitionBlock(searchTags: SearchTag[], activeTag?: string | null): string {
  if (searchTags.length === 0) return 'Partitions: (none configured)';

  const lines = searchTags.map((t) => {
    const hubs = listGroupHubTitles(null, t.value);
    const active = activeTag === t.value ? ' [ACTIVE SCOPE]' : '';
    const hubLines = hubs.map((h) => `    - ${h}`).join('\n');
    return `- tag="${t.value}" label="${t.label}"${active}${hubs.length > 0 ? `\n  Platform hubs:\n${hubLines}` : ''}`;
  });

  return `Available documentation partitions:\n${lines.join('\n')}`;
}

export function buildAiSearchSystemPrompt(
  searchTags: SearchTag[],
  options?: { tag?: string | null },
): string {
  const siteLabel = getSiteName();
  const activeTag = options?.tag?.trim() || null;
  const partitionBlock = formatPartitionBlock(searchTags, activeTag);
  const tagHint = activeTag
    ? `The user has pre-selected partition tag="${activeTag}". Keep platformScope within that partition. Orama will also filter by this tag automatically.`
    : 'No partition pre-selected. Search covers all partitions.';

  return `You are a search query understanding assistant for "${siteLabel}" — an internal knowledge base covering RPA connectors, components, and app deployment docs.

${partitionBlock}

${tagHint}

Your job: given the user's natural-language query (often Chinese, may mix English/brand names), produce a JSON object to drive the search engine.

REQUIRED fields:
- "summary": one sentence in 简体中文 summarizing what the user is looking for (shown back to user)
- "keywords": 2-8 short search terms for full-text search. Rules:
    - Keep brand/product names verbatim (千牛, 阿里妈妈, 达摩盘, DMP, 万相台, 品销宝)
    - Expand synonyms and abbreviations in both directions (DMP <-> 达摩盘)
    - Include domain-specific phrasing users may not type but docs use (授权 -> 账密托管, 子账号, 添加授权)
    - Each term 1-6 characters, NOT full sentences
    - Do NOT include bare "连接器" or "文档" unless the entire query is only about those generic terms
- "primaryKeywords": subset of "keywords" containing only the 1-3 most essential terms that directly reflect the user's core intent. These will be pre-selected as active filter chips; remaining keywords are shown as optional expansions. Rules:
    - Must be a strict subset of "keywords" (same exact strings)
    - Pick terms that best identify the topic, not platform/product names alone
    - For "howto": pick the action/operation terms (e.g. "添加授权", "账密" not just "千牛")
    - For "browse": pick the platform name(s)
    - For "find": pick the topic terms
    - 1 item minimum, 3 items maximum
- "intent": one of:
    - "browse"  — user wants to list/browse all docs of a platform or category ("千牛连接器有哪些", "千牛全部文档")
    - "find"    — user wants specific pages about a topic within a platform ("千牛商品上架", "竞品对比连接器")
    - "howto"   — user asks how to do something ("如何添加授权", "怎么配置", "步骤是什么")
    - "compare" — user wants to compare platforms or features
    - "general" — anything else

OPTIONAL fields:
- "platformScope": URL path of the most relevant platform hub page (e.g. "/docs/rpa/RPA_QIANNIU").
    - Set ONLY when the user clearly names a specific platform AND the primary answer lives there.
    - Do NOT set for "howto" queries — how-to answers often live in auth docs or other cross-partition pages.
    - Do NOT set for "general" or "compare" intents.
    - Use the exact URL path from the hub list above, not a free-form string.

Keywords guidance:
- For "browse" intent: include the platform name and its hub title as keywords
- For "find" intent: include BOTH platform terms AND topic terms; omit bare "连接器"
- For "howto" intent: expand operational terms broadly (授权 -> 添加授权, 账密, 子账号, 托管, 授权流程; 配置 -> 配置方法, 设置, 参数)
- For "compare": include all platform names being compared

Examples:
- "千牛连接器"
  -> summary: "浏览千牛商家工作台的全部连接器文档"
  -> keywords: ["千牛", "千牛商家工作台"]
  -> primaryKeywords: ["千牛"]
  -> intent: "browse", platformScope: "/docs/rpa/RPA_QIANNIU"

- "千牛商品上架连接器"
  -> summary: "查找千牛商家工作台中商品上架相关的连接器"
  -> keywords: ["千牛", "千牛商家工作台", "商品上架", "发布商品", "上架"]
  -> primaryKeywords: ["商品上架", "上架"]
  -> intent: "find", platformScope: "/docs/rpa/RPA_QIANNIU"

- "千牛如何添加授权" / "千牛怎么配置账密"
  -> summary: "查找千牛商家工作台的账密授权添加流程"
  -> keywords: ["千牛", "添加授权", "账密", "子账号", "授权流程", "托管"]
  -> primaryKeywords: ["添加授权", "账密"]
  -> intent: "howto"
  (No platformScope — answer likely in auth docs across partitions)

- "竞品对比相关连接器"
  -> summary: "查找与竞品、竞争商品对比相关的连接器"
  -> keywords: ["竞品", "竞争", "竞争商品", "对比", "竞品分析"]
  -> primaryKeywords: ["竞品", "竞品分析"]
  -> intent: "find"

- "发货超时怎么处理"
  -> summary: "查找处理发货超时的相关文档"
  -> keywords: ["发货超时", "物流延误", "逾期发货", "发货预警", "超时处理"]
  -> primaryKeywords: ["发货超时", "超时处理"]
  -> intent: "howto"

Respond ONLY with the JSON object. No markdown fences, no extra prose. All four of "summary", "keywords", "primaryKeywords", "intent" are REQUIRED.`;
}

// ---------------------------------------------------------------------------
// LLM 调用
// ---------------------------------------------------------------------------

const AI_SEARCH_LLM_TIMEOUT_MS = (() => {
  const raw = process.env.AI_SEARCH_LLM_TIMEOUT_MS?.trim();
  if (!raw) return 18_000;
  const ms = Number.parseInt(raw, 10);
  return Number.isFinite(ms) && ms >= 5_000 ? ms : 18_000;
})();

/** 将 LLM 原始异常序列化为可写入日志的结构（不含 API Key） */
export function formatAiSearchLlmError(cause: unknown): Record<string, unknown> {
  if (APICallError.isInstance(cause)) {
    const body =
      typeof cause.responseBody === 'string'
        ? cause.responseBody.slice(0, 1000)
        : cause.responseBody;
    return {
      type: 'APICallError',
      message: cause.message,
      statusCode: cause.statusCode,
      url: cause.url,
      isRetryable: cause.isRetryable,
      responseBody: body,
    };
  }
  if (cause instanceof z.ZodError) {
    return { type: 'ZodError', issues: cause.issues };
  }
  if (cause instanceof SyntaxError) {
    return { type: 'SyntaxError', message: cause.message };
  }
  if (cause instanceof Error) {
    const record: Record<string, unknown> = { type: cause.name, message: cause.message };
    const code = (cause as NodeJS.ErrnoException).code;
    if (code) record.code = code;
    if (cause.cause) record.cause = formatAiSearchLlmError(cause.cause);
    return record;
  }
  return { raw: String(cause) };
}

function isLlmTimeoutError(cause: unknown): boolean {
  if (APICallError.isInstance(cause)) {
    if (cause.statusCode === 408 || cause.statusCode === 504) return true;
  }
  if (cause instanceof Error) {
    if (cause.name === 'TimeoutError' || cause.name === 'AbortError') return true;
    const code = (cause as NodeJS.ErrnoException).code;
    if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') return true;
    const msg = cause.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('aborted')) return true;
    if (cause.cause) return isLlmTimeoutError(cause.cause);
  }
  return false;
}

function logAiSearchLlmFailure(query: string, cause: unknown): void {
  const kind = isLlmTimeoutError(cause) ? 'llm_timeout' : 'llm_failed';
  console.error(`[AiSearch] LLM interpret ${kind}`, {
    query,
    timeoutMs: AI_SEARCH_LLM_TIMEOUT_MS,
    error: formatAiSearchLlmError(cause),
  });
}

/**
 * 从 LLM 输出文本中提取 JSON，并尝试修复常见的截断问题。
 *
 * 策略：
 * 1. 空输出直接抛错（上层捕获后降级）
 * 2. 去掉 markdown 代码块包裹（```json ... ```）
 * 3. 提取第一个完整的 JSON 对象（{ ... }）
 * 4. 先尝试直接解析
 * 5. 失败时通过栈追踪未闭合的括号/引号，逐级补全
 */
function parseJsonFromLlmText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new SyntaxError('LLM returned empty output');

  // 去掉 markdown fence
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)(?:```|$)/s);
  const unwrapped = fenceMatch ? fenceMatch[1].trim() : trimmed;

  // 提取从第一个 { 到最后一个 } 之间的内容（处理 LLM 在 JSON 前后输出额外文字的情况）
  const firstBrace = unwrapped.indexOf('{');
  const lastBrace = unwrapped.lastIndexOf('}');
  const candidate = firstBrace !== -1
    ? (lastBrace > firstBrace ? unwrapped.slice(firstBrace, lastBrace + 1) : unwrapped.slice(firstBrace))
    : unwrapped;

  if (!candidate) throw new SyntaxError('LLM output contains no JSON object');

  // 直接解析
  try {
    return JSON.parse(candidate);
  } catch {
    // 修复截断：使用栈追踪未闭合的结构，截断到最后一个完整值后补全
    const repaired = repairTruncatedJson(candidate);
    return JSON.parse(repaired);
  }
}

/**
 * 尝试将截断的 JSON 字符串修复为可解析的形式。
 *
 * 算法：扫描字符并维护 括号栈 + 字符串内部标志，记录每个"安全截断点"
 * （即一个完整值结束后的位置），最终在最后一个安全点截断并补全所有未闭合括号。
 *
 * 安全截断点：
 * - 每次 } / ] 闭合后（stack 减少），当前位置是一个完整值结束
 * - 逗号前（当前栈深度 > 0），说明前一个元素已完整
 */
function repairTruncatedJson(s: string): string {
  if (!s) return '{}';

  const stack: Array<'{' | '['> = [];
  let inString = false;
  let lastSafeIdx = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }

    switch (ch) {
      case '"': inString = true; break;
      case '{': stack.push('{'); break;
      case '[': stack.push('['); break;
      case '}':
      case ']':
        stack.pop();
        lastSafeIdx = i + 1;
        break;
      case ',':
        if (stack.length > 0) lastSafeIdx = i;
        break;
    }
  }

  // 完整 JSON，直接返回
  if (stack.length === 0) return s;

  // 找不到任何安全截断点（比如只有 `{"key": ` 这种极短截断），
  // 用整个字符串兜底并补全括号，宁可解析失败也不产生乱数据
  const safe = lastSafeIdx > 0 ? s.slice(0, lastSafeIdx) : s;
  const closing = [...stack].reverse().map((c) => (c === '{' ? '}' : ']')).join('');
  return safe + closing;
}

async function interpretQuery(
  query: string,
  options?: { tag?: string | null },
): Promise<AiSearchInterpretation> {
  const searchTags = getSearchTags();
  const { text } = await generateText({
    model: getLlmJsonModel(),
    system: buildAiSearchSystemPrompt(searchTags, { tag: options?.tag }),
    prompt: query,
    // JSON 输出约 200-500 tokens；留 900 给 summary（中文）+ keywords（8个）+ primaryKeywords + intent + platformScope
    maxOutputTokens: 900,
    abortSignal: AbortSignal.timeout(AI_SEARCH_LLM_TIMEOUT_MS),
  });
  return AiSearchInterpretationSchema.parse(parseJsonFromLlmText(text));
}

// ---------------------------------------------------------------------------
// 后处理辅助
// ---------------------------------------------------------------------------

function normalizeTag(tag?: string | null): string | undefined {
  const t = tag?.trim();
  return t ? t : undefined;
}

/**
 * 过滤掉只被通用词命中、没有实质匹配的结果。
 */
function filterGenericOnlyHits(hits: SearchHitWithKeywords[]): SearchHitWithKeywords[] {
  const generic = new Set(['连接器', '文档']);
  return hits.filter((hit) =>
    hit.matchedKeywords.some((k) => k !== '__browse_expand__' && !generic.has(k)),
  );
}

/**
 * browse intent 时，过滤掉 hub 页本身（只展示子页），
 * 除非命中词是 browse_expand（即展开追加的页面）。
 */
function filterHubsFromBrowseResults(hits: SearchHitWithKeywords[]): SearchHitWithKeywords[] {
  return hits.filter((hit) => {
    if (hit.type !== 'page') return true;
    if (isGroupHubUrl(hit.url, slugsDepthFromUrl(hit.url))) {
      // 只有被展开追加的 hub 页保留（作为目录入口）
      return hit.matchedKeywords.includes('__browse_expand__');
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

export async function runAiSearch(params: {
  query: string;
  locale?: string | null;
  limit?: number;
  /** 用户选择的分区 slug（如 rpa / auth）；未传则全库检索 */
  tag?: string | null;
  access: DocAccessContext;
}): Promise<AiSearchResult> {
  const query = params.query.trim();
  if (query.length < 2) {
    return { ok: false, error: { kind: 'query_too_short' } };
  }
  if (!isLlmConfigured()) {
    return { ok: false, error: { kind: 'unavailable' } };
  }

  const tag = normalizeTag(params.tag);
  const limit = Math.min(Math.max(params.limit ?? 40, 1), 80);
  const perKeywordLimit = 30;

  // ── 1. LLM 语义理解 ──────────────────────────────────────────────────────
  let interpretation: AiSearchInterpretation;
  const cached = getCachedAiInterpretation(query, params.locale, tag);
  if (cached) {
    interpretation = cached;
  } else {
    try {
      interpretation = await interpretQuery(query, { tag });
      setCachedAiInterpretation(query, params.locale, interpretation, tag);
    } catch (cause) {
      logAiSearchLlmFailure(query, cause);
      return {
        ok: false,
        error: isLlmTimeoutError(cause)
          ? { kind: 'llm_timeout', cause }
          : { kind: 'llm_failed', cause },
      };
    }
  }

  // ── 2. Orama 全文检索（多关键词并行，按分区过滤）────────────────────────
  const searchOptions = {
    locale: params.locale ?? null,
    limit: perKeywordLimit,
    ...(tag ? { tag: [tag] } : {}),
  };
  const resultsByKeyword = await Promise.all(
    interpretation.keywords.map(async (keyword) => ({
      keyword,
      results: await getDocsSearchApi().search(keyword, searchOptions),
    })),
  );

  // ── 3. 合并去重 ───────────────────────────────────────────────────────────
  let hits = dedupeHits(mergeSearchResultsByKeyword(resultsByKeyword));

  // ── 4. 按 intent 做后处理 ─────────────────────────────────────────────────
  const { intent, platformScope } = interpretation;

  if (intent === 'browse') {
    // browse：展开命中 hub 下的全部子页
    hits = expandHubsFromHits(hits, params.locale, tag);
  } else {
    // find / howto / compare / general：过滤掉纯通用词命中
    hits = filterGenericOnlyHits(hits);

    // 非 browse 时排除没有实质命中的 hub 页（避免目录页污染结果）
    if (intent === 'find') {
      hits = hits.filter(
        (hit) => !(hit.type === 'page' && isGroupHubUrl(hit.url, slugsDepthFromUrl(hit.url))),
      );
    }
  }

  if (intent === 'browse') {
    hits = filterHubsFromBrowseResults(hits);
  }

  // ── 5. platformScope soft boost（不排除其他结果）─────────────────────────
  if (platformScope) {
    hits = boostByPlatformScope(hits, platformScope);
  }

  // ── 6. LLM 语义重排（browse 展开结果已按目录顺序排好，跳过）────────────
  if (intent !== 'browse') {
    // 关键词相关性兜底排序（始终先排好，保证快速响应）
    hits = [...hits].sort(
      (a, b) =>
        scoreTopicHit(b, interpretation.keywords) -
        scoreTopicHit(a, interpretation.keywords) ||
        String(a.content).localeCompare(String(b.content), 'zh-CN'),
    );

    // 命中上次 rerank 缓存（后台 rerank 已完成），直接使用 reranked 顺序
    const cachedReranked = getCachedRerankResults(query, tag);
    if (cachedReranked) {
      hits = cachedReranked;
    } else if (hits.length > 1) {
      // 非阻塞：在后台执行 rerank，结果写入缓存供后续请求命中
      void rerankSearchHits(query, hits).then((reranked) => {
        setCachedRerankResults(query, tag, reranked);
      });
    }
  }

  // ── 7. 权限过滤 → 截断（不做 scope 过滤，由客户端负责）──────────────────
  // scope 过滤放在客户端，这样切换全文/仅文档时无需重新请求 API。
  const accessible = filterSearchHitsByDocAccess(hits, params.access);
  const truncated = truncateSearchHitsPreservingPages(accessible, limit);

  return {
    ok: true,
    value: { interpretation, results: truncated },
  };
}
