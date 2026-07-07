import type { SortedResult } from 'fumadocs-core/search';

export type SearchScope = 'full' | 'page';

export function parseSearchScope(value: string | null | undefined): SearchScope {
  return value === 'page' ? 'page' : 'full';
}

/**
 * 「仅文档」模式：匹配逻辑不变（正文/标题均参与检索），仅在展示层过滤掉
 * `heading` / `text` 条目，每篇文档最多保留 1 条 `type: page`。
 */
export function filterSearchByScope<T extends { type: string }>(
  results: T[],
  scope: SearchScope,
): T[] {
  return scope === 'page' ? results.filter((r) => r.type === 'page') : results;
}

export type SearchHitWithKeywords = SortedResult & { matchedKeywords: string[] };

export function normalizeSearchMatchText(value: string): string {
  return value.toLowerCase().replace(/[\s_\-/]+/g, '');
}

/** 主题词是否出现在页面标题或面包屑（过滤 Orama 正文误命中） */
export function titleMatchesTopicKeywords(
  hit: SearchHitWithKeywords,
  topicKeywords: string[],
): boolean {
  if (topicKeywords.length === 0) return true;
  const haystack = normalizeSearchMatchText(
    `${String(hit.content ?? '').replace(/<[^>]+>/g, '')} ${(hit.breadcrumbs ?? []).join(' ')}`,
  );
  return topicKeywords.some((kw) => {
    const needle = normalizeSearchMatchText(kw);
    return needle.length > 0 && haystack.includes(needle);
  });
}

/**
 * 按用户选中的 Chip（OR）过滤 AI 结果。
 * 仅选中主题 Chip 时，对 page 类型额外要求标题/面包屑含主题词，保证默认视图精准；
 * 选中平台/文档族 Chip 时放宽，便于用户自行扩大范围。
 */
export function filterAiResultsBySelectedKeywords(
  results: SearchHitWithKeywords[],
  selectedKeywords: Set<string>,
  options: {
    topicKeywords: string[];
    platformChipsActive: boolean;
  },
): SearchHitWithKeywords[] {
  if (selectedKeywords.size === 0) return [];

  let filtered = results.filter((r) =>
    r.matchedKeywords.some((k) => selectedKeywords.has(k)),
  );

  const activeTopic = [...selectedKeywords].filter((k) => options.topicKeywords.includes(k));
  if (!options.platformChipsActive && activeTopic.length > 0) {
    filtered = filtered.filter(
      (hit) => hit.type !== 'page' || titleMatchesTopicKeywords(hit, activeTopic),
    );
  }

  return filtered;
}

/** 全文模式下优先保留全部 page 条目，再用正文片段填满剩余配额 */
export function truncateSearchHitsPreservingPages(
  hits: SearchHitWithKeywords[],
  limit: number,
): SearchHitWithKeywords[] {
  if (hits.length <= limit) return hits;

  const pages = hits.filter((h) => h.type === 'page');
  const rest = hits.filter((h) => h.type !== 'page');
  const pageQuota = Math.min(pages.length, limit);
  const restQuota = Math.max(0, limit - pageQuota);
  return [...pages.slice(0, pageQuota), ...rest.slice(0, restQuota)];
}

/**
 * 合并多个关键词的 Orama 检索结果：按 `id`（page 为 page url，子级为 `${pageId}-n`）去重，
 * 优先保留信息更完整的 `page` 类型条目；记录命中该结果的全部关键词供前端 Chip 客户端过滤。
 */
export function mergeSearchResultsByKeyword(
  resultsByKeyword: Array<{ keyword: string; results: SortedResult[] }>,
): SearchHitWithKeywords[] {
  const merged = new Map<string, SearchHitWithKeywords>();

  for (const { keyword, results } of resultsByKeyword) {
    for (const hit of results) {
      const existing = merged.get(hit.id);
      if (!existing) {
        merged.set(hit.id, { ...hit, matchedKeywords: [keyword] });
        continue;
      }
      if (!existing.matchedKeywords.includes(keyword)) {
        existing.matchedKeywords.push(keyword);
      }
      // 同一 id 内容理论上一致（同一 page/heading/text），无需覆盖 content。
    }
  }

  return [...merged.values()];
}
