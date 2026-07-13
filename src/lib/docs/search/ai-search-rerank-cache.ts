import type { SearchHitWithKeywords } from '@/lib/docs/search/search-utils';

/**
 * 短生命周期的 rerank 结果缓存（内存级，进程内共享）。
 * rerank 在后台异步完成后，结果写入此处；
 * 下次相同查询请求到来时直接命中 reranked 顺序，跳过阻塞等待。
 *
 * TTL: 5 分钟（足够覆盖用户一次搜索会话）
 * 容量: 最多 32 条
 */

type RerankCacheEntry = {
  results: SearchHitWithKeywords[];
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 32;

const cache = new Map<string, RerankCacheEntry>();

export function buildRerankCacheKey(query: string, tag: string | null | undefined): string {
  return `${tag ?? ''}\0${query.trim()}`;
}

export function getCachedRerankResults(
  query: string,
  tag: string | null | undefined,
): SearchHitWithKeywords[] | undefined {
  const key = buildRerankCacheKey(query, tag);
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.results;
}

export function setCachedRerankResults(
  query: string,
  tag: string | null | undefined,
  results: SearchHitWithKeywords[],
): void {
  const key = buildRerankCacheKey(query, tag);
  if (cache.size >= CACHE_MAX && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.delete(key);
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}
