import type { AiSearchInterpretation } from '@/lib/docs/search/ai-search';

const CACHE_MAX = (() => {
  const raw = process.env.AI_SEARCH_CACHE_MAX?.trim();
  if (!raw) return 64;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 8 ? n : 64;
})();

/** query + locale + tag → LLM 语义理解结果（不含 Orama 检索，检索仍每次执行以反映索引与权限） */
const cache = new Map<string, AiSearchInterpretation>();

export function buildAiInterpretCacheKey(
  query: string,
  locale: string | null | undefined,
  tag?: string | null,
): string {
  return `${locale ?? ''}\0${tag ?? ''}\0${query.trim()}`;
}

export function peekCachedAiInterpretation(
  query: string,
  locale: string | null | undefined,
  tag?: string | null,
): AiSearchInterpretation | undefined {
  return cache.get(buildAiInterpretCacheKey(query, locale, tag));
}

/** 读取并刷新 LRU 顺序 */
export function getCachedAiInterpretation(
  query: string,
  locale: string | null | undefined,
  tag?: string | null,
): AiSearchInterpretation | undefined {
  const key = buildAiInterpretCacheKey(query, locale, tag);
  const hit = cache.get(key);
  if (!hit) return undefined;
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

export function setCachedAiInterpretation(
  query: string,
  locale: string | null | undefined,
  interpretation: AiSearchInterpretation,
  tag?: string | null,
): void {
  const key = buildAiInterpretCacheKey(query, locale, tag);
  if (cache.size >= CACHE_MAX && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.delete(key);
  cache.set(key, interpretation);
}
