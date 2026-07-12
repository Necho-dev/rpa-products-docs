import type { SortedResult } from 'fumadocs-core/search';
import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';
import { source } from '@/lib/docs/source/source';
import type { SearchHitWithKeywords } from '@/lib/docs/search/search-utils';
import { normalizeSearchMatchText } from '@/lib/docs/search/search-utils';

type DocPage = ReturnType<typeof source.getPages>[number];

type CatalogPage = {
  page: DocPage;
  url: string;
  title: string;
  description: string;
  /** slug 段数，用于判断目录层级 */
  depth: number;
  folderUrl: string;
};

function normalizeForMatch(value: string): string {
  return normalizeSearchMatchText(value);
}

function getFolderUrl(pageUrl: string): string {
  const idx = pageUrl.lastIndexOf('/');
  return idx > 0 ? pageUrl.slice(0, idx) : pageUrl;
}

function isTreeName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFolderOrItem(node: Node): node is Folder | Item {
  return node.type === 'folder' || node.type === 'page';
}

function findBreadcrumbs(tree: Root, pageUrl: string): string[] | undefined {
  function walk(nodes: Node[], trail: string[]): string[] | undefined {
    for (const node of nodes) {
      if (!isFolderOrItem(node)) continue;
      if (node.type === 'page') {
        if (node.url === pageUrl) return trail;
        continue;
      }
      const nextTrail = isTreeName(node.name) ? [...trail, node.name] : trail;
      const found = walk(node.children, nextTrail);
      if (found) return found;
    }
    return undefined;
  }

  const rootTrail = isTreeName(tree.name) ? [tree.name] : [];
  return walk(tree.children, rootTrail);
}

function getCatalogPages(locale?: string | null, tag?: string | null): CatalogPage[] {
  let pages = source.getPages();
  const languages = source.getLanguages();
  if (locale && languages.length > 0) {
    pages = pages.filter((p) => p.locale === locale);
  }
  if (tag) {
    pages = pages.filter((p) => p.slugs[0] === tag);
  }

  return pages.map((page) => ({
    page,
    url: page.url,
    title: page.data.title ?? '',
    description: page.data.description ?? '',
    depth: page.slugs.length,
    folderUrl: getFolderUrl(page.url),
  }));
}

/** 当前分区下的文档组 hub 标题（供 AI prompt 动态注入） */
export function listGroupHubTitles(locale?: string | null, tag?: string | null): string[] {
  return getCatalogPages(locale, tag)
    .filter((p) => isGroupHubUrl(p.url, p.depth))
    .map((p) => p.title)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function scoreCatalogPage(page: CatalogPage, term: string): number {
  const needle = normalizeForMatch(term);
  if (!needle) return 0;

  let score = 0;
  if (normalizeForMatch(page.title).includes(needle)) score += 12;
  if (normalizeForMatch(page.description).includes(needle)) score += 6;
  if (normalizeForMatch(page.url).includes(needle)) score += 4;
  return score;
}

/**
 * 文档组 hub：slug 深度为 2 的页面（即 /section/group/ 结构的目录索引页）。
 *
 * `depth` 为 `page.slugs.length`，适用于所有分区，无需绑定命名约定：
 * - /docs/rpa/RPA_QIANNIU  → depth=2 ✅
 * - /docs/auth/rpa-credential → depth=2 ✅
 * - /docs/rpa/RPA_QIANNIU/rpa-conn-xxx → depth=3，非 hub ✅
 *
 * 当只有 URL 可用时（如 SearchHit），可用 `slugsDepthFromUrl(url)` 推算 depth。
 */
export function isGroupHubUrl(url: string, depth: number): boolean {
  return depth === 2;
}

const DOCS_PREFIX = '/docs/';

/** 从页面 URL 推算 slug 深度（去掉 `/docs/` 前缀后的路径段数） */
export function slugsDepthFromUrl(url: string): number {
  const after = url.startsWith(DOCS_PREFIX) ? url.slice(DOCS_PREFIX.length) : url.replace(/^\//, '');
  return after ? after.split('/').filter(Boolean).length : 0;
}

function isGroupHub(page: CatalogPage): boolean {
  return isGroupHubUrl(page.url, page.depth);
}

/**
 * 命中页面的综合文本（title + breadcrumbs + url slug），用于相关性打分。
 */
export function hitSearchText(hit: SearchHitWithKeywords): string {
  const raw = String(hit.content ?? '').replace(/<[^>]+>/g, '');
  return `${raw} ${(hit.breadcrumbs ?? []).join(' ')} ${hit.url.split('/').pop() ?? ''}`;
}

/**
 * 关键词与命中页面的相关性得分（用于 rankByTopicRelevance）。
 */
export function scoreTopicHit(hit: SearchHitWithKeywords, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const haystack = normalizeForMatch(hitSearchText(hit));
  let points = 0;
  for (const kw of keywords) {
    const needle = normalizeForMatch(kw);
    if (!needle) continue;
    if (haystack.includes(needle)) points += 3;
    if (hit.matchedKeywords.includes(kw)) points += 2;
  }
  return points;
}

/**
 * browse intent：命中了某个 hub 页时，把该 hub 下的全部子页追加进结果。
 * 仅当 intent === 'browse' 时调用，作为目录展开。
 */
export function expandHubsFromHits(
  hits: SearchHitWithKeywords[],
  locale?: string | null,
  tag?: string | null,
): SearchHitWithKeywords[] {
  const catalog = getCatalogPages(locale, tag);
  const urlToPage = new Map(catalog.map((p) => [p.url, p]));

  // 找出命中的 hub URL
  const hubUrls = new Set<string>();
  for (const hit of hits) {
    if (hit.type !== 'page') continue;
    const page = urlToPage.get(hit.url);
    if (!page) continue;
    if (isGroupHub(page)) {
      hubUrls.add(page.url);
      continue;
    }
    // 子页 → 记录其父 hub
    const parent = urlToPage.get(page.folderUrl);
    if (parent && isGroupHub(parent)) hubUrls.add(parent.url);
  }

  if (hubUrls.size === 0) return hits;

  // 把 hub 及其子页全部加入
  const existingIds = new Set(hits.map((h) => h.id));
  const extra: SearchHitWithKeywords[] = [];

  for (const page of catalog) {
    const belongsToHub = [...hubUrls].some(
      (hubUrl) => page.url === hubUrl || page.url.startsWith(`${hubUrl}/`),
    );
    if (!belongsToHub) continue;
    if (existingIds.has(page.url)) continue;
    existingIds.add(page.url);
    extra.push({
      id: page.url,
      type: 'page',
      content: page.title,
      breadcrumbs: findBreadcrumbs(source.getPageTree(page.page.locale), page.url) ?? [],
      url: page.url,
      matchedKeywords: ['__browse_expand__'],
    });
  }

  // hub 页置顶，其余按标题排序
  const combined = [...hits, ...extra];
  combined.sort((a, b) => {
    const aHub = hubUrls.has(a.url);
    const bHub = hubUrls.has(b.url);
    if (aHub !== bHub) return aHub ? -1 : 1;
    return String(a.content).localeCompare(String(b.content), 'zh-CN');
  });
  return combined;
}

/**
 * platformScope 加权：将命中 platformScope 前缀的 hits 提升到前面，
 * 同时保留其他匹配结果（soft boost，不排除）。
 */
export function boostByPlatformScope(
  hits: SearchHitWithKeywords[],
  platformScope: string,
): SearchHitWithKeywords[] {
  if (!platformScope) return hits;
  return [...hits].sort((a, b) => {
    const aIn = a.url === platformScope || a.url.startsWith(`${platformScope}/`);
    const bIn = b.url === platformScope || b.url.startsWith(`${platformScope}/`);
    if (aIn !== bIn) return aIn ? -1 : 1;
    return 0;
  });
}

/**
 * 去重合并：优先保留 page 类型，合并 matchedKeywords。
 */
export function dedupeHits(hits: SearchHitWithKeywords[]): SearchHitWithKeywords[] {
  const byId = new Map<string, SearchHitWithKeywords>();
  for (const hit of hits) {
    const existing = byId.get(hit.id);
    if (!existing) {
      byId.set(hit.id, { ...hit });
      continue;
    }
    for (const kw of hit.matchedKeywords) {
      if (!existing.matchedKeywords.includes(kw)) existing.matchedKeywords.push(kw);
    }
    if (hit.type === 'page' && existing.type !== 'page') {
      byId.set(hit.id, { ...hit, matchedKeywords: existing.matchedKeywords });
    }
  }
  return [...byId.values()];
}
