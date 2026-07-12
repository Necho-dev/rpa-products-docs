import type { SortedResult } from 'fumadocs-core/search';

export type SearchScope = 'full' | 'page';

export function parseSearchScope(value: string | null | undefined): SearchScope {
  return value === 'page' ? 'page' : 'full';
}

/** 当前选中的分区 tag；null 表示"全部分区" */
export type SearchTagFilter = string | null;

/**
 * 「仅文档」模式下按查询词对 page 条目重排序的得分函数。
 *
 * 分层规则（分值不重叠，保证稳定的优先级顺序）：
 * - title 完全等于查询词      → +40
 * - title 以查询词开头        → +30
 * - title 包含查询词          → +20
 * - breadcrumbs 包含查询词   → +10
 * - 以上均不命中              → 0（保留 Orama 原始位置）
 */
function scorePageByTitle(
  content: unknown,
  breadcrumbs: unknown,
  query: string,
): number {
  const needle = normalizeSearchMatchText(query);
  if (!needle) return 0;

  const title = normalizeSearchMatchText(
    typeof content === 'string' ? content.replace(/<[^>]+>/g, '') : '',
  );

  if (title === needle) return 40;
  if (title.startsWith(needle)) return 30;
  if (title.includes(needle)) return 20;

  const crumbs = Array.isArray(breadcrumbs)
    ? normalizeSearchMatchText(
        (breadcrumbs as unknown[])
          .map((c) => (typeof c === 'string' ? c : ''))
          .join(' '),
      )
    : '';
  if (crumbs.includes(needle)) return 10;

  return 0;
}

/**
 * 「仅文档」模式：匹配逻辑不变（正文/标题均参与检索），仅在展示层过滤掉
 * `heading` / `text` 条目，每篇文档最多保留 1 条 `type: page`。
 *
 * 当传入 `query` 时，对过滤后的 page 条目按 title 相关性重新排序，
 * 避免因 Orama 正文匹配得分高于标题得分而导致标题不相关的文档排在前面。
 * 得分相同时保留 Orama 原有的相对顺序（稳定排序）。
 */
export function filterSearchByScope<T extends { type: string; content?: unknown; breadcrumbs?: unknown }>(
  results: T[],
  scope: SearchScope,
  query?: string,
): T[] {
  if (scope !== 'page') return results;

  const pages = results.filter((r) => r.type === 'page');
  if (!query || !query.trim()) return pages;

  // 稳定排序：先记录原始下标，分数相同时按原始位置升序
  return pages
    .map((r, i) => ({ r, i, score: scorePageByTitle(r.content, r.breadcrumbs, query) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ r }) => r);
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
 * 全文展示排序：每个 page 后紧跟同 URL 的 heading/text。
 *
 * `truncateSearchHitsPreservingPages` 会把全部 page 堆到前面，导致「全文」首屏
 * 与「仅文档」观感相同。展示前按页面交错，才能看出正文片段。
 */
export function interleaveSearchHitsByPage<T extends { type: string; url: string }>(
  results: T[],
): T[] {
  if (results.length === 0) return results;

  const pages: T[] = [];
  const childrenByUrl = new Map<string, T[]>();

  for (const r of results) {
    if (r.type === 'page') {
      pages.push(r);
      continue;
    }
    const list = childrenByUrl.get(r.url);
    if (list) list.push(r);
    else childrenByUrl.set(r.url, [r]);
  }

  if (pages.length === 0 || childrenByUrl.size === 0) return results;

  const out: T[] = [];
  const emittedChildUrls = new Set<string>();

  for (const page of pages) {
    out.push(page);
    const children = childrenByUrl.get(page.url);
    if (!children) continue;
    out.push(...children);
    emittedChildUrls.add(page.url);
  }

  for (const [url, children] of childrenByUrl) {
    if (!emittedChildUrls.has(url)) out.push(...children);
  }

  return out;
}

/**
 * 对展示层结果去重：`content` 完全相同（忽略大小写/空白）的同类型条目只保留第一条。
 *
 * 适用场景：同一连接器文档在多个位置有相同的 heading/text 片段，
 * Orama 会为每个位置生成不同的 `id`，但用户看到的内容完全相同，属于冗余展示。
 */
export function dedupeSearchResults<T extends SortedResult>(results: T[]): T[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    // page 类型以 url(id) 去重，heading/text 以 type+content 去重
    const key =
      r.type === 'page'
        ? `page::${r.id}`
        : `${r.type}::${String(r.content ?? '').trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
