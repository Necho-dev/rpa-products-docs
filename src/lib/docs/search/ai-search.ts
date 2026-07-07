import { APICallError } from '@ai-sdk/provider';
import { generateText } from 'ai';
import { z } from 'zod';
import { getLlmJsonModel } from '@/lib/ai/llm';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { filterSearchHitsByDocAccess } from '@/lib/docs/docs-site-tools';
import { getDocsSearchApi } from '@/lib/docs/search/docs-search-server';
import {
  expandFolderUrlsToHits,
  filterHitsByTopicScope,
  inferDocFamiliesFromKeywords,
  inferFolderUrlsFromKeywordHits,
  isConnectorPackHubUrl,
  rankAiSearchHits,
  resolveDocFamilyFolderUrls,
  scoreTopicHit,
  validateDocFamilies,
} from '@/lib/docs/search/ai-search-catalog';
import {
  getCachedAiInterpretation,
  setCachedAiInterpretation,
} from '@/lib/docs/search/ai-search-interpret-cache';
import {
  filterSearchByScope,
  mergeSearchResultsByKeyword,
  truncateSearchHitsPreservingPages,
  type SearchHitWithKeywords,
  type SearchScope,
} from '@/lib/docs/search/search-utils';

const AiSearchInterpretationSchema = z.object({
  summary: z.string().describe('一句话概括用户搜索意图, 面向用户展示, 使用简体中文'),
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .max(6)
    .describe('用于全文检索的短关键词, 比如同义词、缩写、中英对照等, 每个词尽量简短(1-6 个字/词)'),
  docFamilies: z
    .array(z.string().min(1))
    .max(3)
    .optional()
    .describe(
      '用户明确限定的文档族/平台(如「千牛商家工作台」), 用于锁定检索范围, 避免跨平台串结果',
    ),
  expandFamilies: z
    .boolean()
    .optional()
    .describe(
      '是否展开 docFamilies 下的全部子文档, 仅当用户明确要「全部/所有/有哪些」连接器时为 true; 若还指定了具体业务主题(如商品上架、物流)则为 false',
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

function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

export function isAiSearchAvailable(): boolean {
  return isLlmConfigured();
}

export { peekCachedAiInterpretation } from '@/lib/docs/search/ai-search-interpret-cache';

const AI_SEARCH_SYSTEM_PROMPT = `You are a query understanding assistant for an internal RPA knowledge base documentation site (连接器 connectors / 组件 components / 应用部署 app deployment docs).

Given a user's natural-language search request (often in Chinese, sometimes mixing English abbreviations/brand names), respond with a JSON object with these REQUIRED fields:
- "summary": a short one-sentence summary (in 简体中文) of what the user is looking for, to be shown back to the user so they can confirm you understood correctly.
- "keywords": an array of 1-6 short search keywords (strings) suitable for full-text search against the docs index. Keywords should:
  - Preserve brand/product names verbatim (e.g. 阿里妈妈, 达摩盘, 万相台, 品销宝, 千牛商家工作台)
  - Expand well-known Chinese/English abbreviation pairs both ways (e.g. DMP <-> 达摩盘)
  - Be short (1-6 characters/words), not full sentences
  - AVOID generic stopwords-only keywords: do NOT output bare "连接器" or "文档" unless the user's entire query is only about connectors/docs in general
  - When user says "X连接器" (e.g. 千牛连接器), prefer product-specific terms like "千牛", "千牛商家工作台" — NOT the generic word "连接器" alone
  - When docFamilies is set, do NOT include "X连接器" or bare "连接器" in keywords — use topic terms instead

OPTIONAL fields:
- "docFamilies": array of 0-3 official documentation family titles when the user specifies a platform/product scope. ALWAYS set this when a platform is identifiable. Examples:
  - "千牛商品上架" -> docFamilies: ["千牛商家工作台"]
  - "千牛连接器" -> docFamilies: ["千牛商家工作台"]
  - Use hub page title (千牛商家工作台), NOT colloquial phrases (千牛连接器)
- "expandFamilies": boolean — whether to return ALL pages under docFamilies:
  - true: user wants the complete list ("千牛有哪些连接器", "千牛全部文档", "千牛连接器")
  - false (default when omitted): user also specifies a business topic ("千牛商品上架", "千牛物流异常") — search only matching pages within the family, NOT the entire pack

Keywords guidance for scoped queries:
  - Include BOTH platform terms (千牛, 千牛商家工作台) AND topic terms (商品上架, 发布商品, 上架)
  - NEVER use bare "连接器" alone
  - Topic terms should be specific to the user's intent, not generic words that match other platforms (prefer "商品上架" over bare "商品" when possible)
  - Expand business/topic synonyms and related doc phrasing into keywords (e.g. 竞品 -> also 竞争, 竞争商品, 对比, 竞品分析)

Examples (query -> JSON; illustrative only):
- "千牛商品发布连接器"
  -> summary: "查找千牛商家工作台中商品发布相关的连接器文档"
  -> keywords: ["千牛", "千牛商家工作台", "商品发布", "发布商品", "上架"]
  -> docFamilies: ["千牛商家工作台"], expandFamilies: false

- "千牛连接器"
  -> keywords: ["千牛", "千牛商家工作台"]
  -> docFamilies: ["千牛商家工作台"], expandFamilies: true

- "竞品相关的连接器" / "竞品对比相关的连接器" / "竞品相关连接器" / "竞品(竞争商品)相关的连接器"
  -> summary: "查找与竞品、竞争商品对比相关的连接器文档"
  -> keywords: ["竞品", "竞争", "竞争商品", "对比", "竞品分析"]  (以上几种问法等价, keywords 应一致)
  -> expandFamilies: false (no platform scope unless user names one)

- "千牛竞品对比"
  -> keywords: ["千牛", "千牛商家工作台", "竞品", "竞争", "竞争商品", "对比"]
  -> docFamilies: ["千牛商家工作台"], expandFamilies: false

Respond ONLY with the JSON object — no extra prose, no markdown code fences. Both "summary" and "keywords" are REQUIRED.`;

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
    const record: Record<string, unknown> = {
      type: cause.name,
      message: cause.message,
    };
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

function parseJsonFromLlmText(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}

async function interpretQuery(query: string): Promise<AiSearchInterpretation> {
  const { text } = await generateText({
    model: getLlmJsonModel(),
    system: AI_SEARCH_SYSTEM_PROMPT,
    prompt: query,
    abortSignal: AbortSignal.timeout(AI_SEARCH_LLM_TIMEOUT_MS),
  });
  return AiSearchInterpretationSchema.parse(parseJsonFromLlmText(text));
}

function mergeFolderMaps(...maps: Map<string, string>[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const map of maps) {
    for (const [folder, family] of map) merged.set(folder, family);
  }
  return merged;
}

function isInFamilyScope(url: string, familyFolderUrls: string[]): boolean {
  return familyFolderUrls.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
}

function getTopicKeywords(
  interpretation: AiSearchInterpretation,
  resolvedFamilies: string[],
): string[] {
  const familyTerms = new Set([
    ...resolvedFamilies,
    ...(interpretation.docFamilies ?? []).map((f) => f.trim()),
  ]);
  const generic = new Set(['连接器', '文档', '千牛']);
  const hasFamily = familyTerms.size > 0;

  return interpretation.keywords.filter((k) => {
    const trimmed = k.trim();
    if (!trimmed || familyTerms.has(trimmed) || generic.has(trimmed)) return false;
    if (hasFamily && trimmed.endsWith('连接器')) return false;
    return true;
  });
}

function rankByTopicRelevance(
  hits: SearchHitWithKeywords[],
  topicKeywords: string[],
): SearchHitWithKeywords[] {
  if (topicKeywords.length === 0) return hits;
  return [...hits].sort(
    (a, b) =>
      scoreTopicHit(b, topicKeywords) - scoreTopicHit(a, topicKeywords) ||
      String(a.content).localeCompare(String(b.content), 'zh-CN'),
  );
}

export async function runAiSearch(params: {
  query: string;
  scope: SearchScope;
  locale?: string | null;
  limit?: number;
  access: DocAccessContext;
}): Promise<AiSearchResult> {
  const query = params.query.trim();
  if (query.length < 2) {
    return { ok: false, error: { kind: 'query_too_short' } };
  }

  if (!isLlmConfigured()) {
    return { ok: false, error: { kind: 'unavailable' } };
  }

  const limit = Math.min(Math.max(params.limit ?? 40, 1), 80);
  const perKeywordLimit = 30;

  let interpretation: AiSearchInterpretation;
  const cached = getCachedAiInterpretation(query, params.locale);
  if (cached) {
    interpretation = cached;
  } else {
    try {
      interpretation = await interpretQuery(query);
      setCachedAiInterpretation(query, params.locale, interpretation);
    } catch (cause) {
      logAiSearchLlmFailure(query, cause);
      if (isLlmTimeoutError(cause)) {
        return { ok: false, error: { kind: 'llm_timeout', cause } };
      }
      return { ok: false, error: { kind: 'llm_failed', cause } };
    }
  }

  const searchApi = getDocsSearchApi();
  const resultsByKeyword = await Promise.all(
    interpretation.keywords.map(async (keyword) => ({
      keyword,
      results: await searchApi.search(keyword, {
        locale: params.locale ?? null,
        limit: perKeywordLimit,
      }),
    })),
  );

  const keywordMerged = mergeSearchResultsByKeyword(resultsByKeyword);

  const resolvedFamilies = [
    ...new Set([
      ...validateDocFamilies(interpretation.docFamilies ?? [], params.locale),
      ...inferDocFamiliesFromKeywords(interpretation.keywords, params.locale),
    ]),
  ];
  const topicKeywords = getTopicKeywords(
    { ...interpretation, docFamilies: resolvedFamilies },
    resolvedFamilies,
  );

  const familyFolders = resolveDocFamilyFolderUrls(resolvedFamilies, params.locale);
  const hasFamilyScope = familyFolders.size > 0;
  const shouldExpandAll =
    interpretation.expandFamilies === true ||
    (interpretation.expandFamilies !== false && topicKeywords.length === 0);

  const inferredFolders = hasFamilyScope
    ? new Map<string, string>()
    : inferFolderUrlsFromKeywordHits(keywordMerged, params.locale);
  const expandFolders = hasFamilyScope
    ? familyFolders
    : mergeFolderMaps(familyFolders, inferredFolders);

  const familyFolderUrls = [...expandFolders.keys()];
  const catalogHits =
    shouldExpandAll && expandFolders.size > 0
      ? expandFolderUrlsToHits(expandFolders, params.locale)
      : [];

  let keywordHits = keywordMerged;
  if (hasFamilyScope) {
    keywordHits = keywordMerged.filter((hit) => isInFamilyScope(hit.url, familyFolderUrls));
  }

  let combined = rankAiSearchHits(
    [...catalogHits, ...keywordHits],
    new Set(expandFolders.keys()),
  );

  if (hasFamilyScope) {
    combined = combined.filter((hit) => isInFamilyScope(hit.url, familyFolderUrls));
  } else {
    const genericKeywords = new Set(['连接器', '文档']);
    combined = combined.filter((hit) =>
      hit.matchedKeywords.some((k) => !genericKeywords.has(k)),
    );
  }

  if (!shouldExpandAll && topicKeywords.length > 0) {
    combined = filterHitsByTopicScope(combined, topicKeywords);
    combined = rankByTopicRelevance(combined, topicKeywords);
  } else if (shouldExpandAll && topicKeywords.length > 0) {
    combined = combined.filter(
      (hit) => !(hit.type === 'page' && isConnectorPackHubUrl(hit.url)),
    );
  }

  const accessible = filterSearchHitsByDocAccess(combined, params.access);
  const truncated =
    params.scope === 'page'
      ? accessible.slice(0, limit)
      : truncateSearchHitsPreservingPages(accessible, limit);
  const scoped = filterSearchByScope(truncated, params.scope);

  if (familyFolders.size > 0) {
    return {
      ok: true,
      value: {
        interpretation: {
          ...interpretation,
          docFamilies: resolvedFamilies.length > 0 ? resolvedFamilies : interpretation.docFamilies,
        },
        results: scoped.filter((hit) => isInFamilyScope(hit.url, familyFolderUrls)),
      },
    };
  }

  return {
    ok: true,
    value: {
      interpretation: {
        ...interpretation,
        docFamilies: resolvedFamilies.length > 0 ? resolvedFamilies : interpretation.docFamilies,
      },
      results: scoped,
    },
  };
}
