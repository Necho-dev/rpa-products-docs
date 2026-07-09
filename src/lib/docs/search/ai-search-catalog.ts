import type { SortedResult } from 'fumadocs-core/search';
import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';
import { source } from '@/lib/docs/source/source';
import type { SearchHitWithKeywords } from '@/lib/docs/search/search-utils';
import {
  normalizeSearchMatchText,
  titleMatchesTopicKeywords,
} from '@/lib/docs/search/search-utils';

type DocPage = ReturnType<typeof source.getPages>[number];

type CatalogPage = {
  page: DocPage;
  url: string;
  title: string;
  description: string;
  entry?: string;
  folderUrl: string;
};

type PageFrontmatterExtras = { entry?: string };

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

function getCatalogPages(locale?: string | null): CatalogPage[] {
  let pages = source.getPages();
  const languages = source.getLanguages();
  if (locale && languages.length > 0) {
    pages = pages.filter((p) => p.locale === locale);
  }

  return pages.map((page) => {
    const data = page.data as PageFrontmatterExtras & { title?: string; description?: string };
    return {
      page,
      url: page.url,
      title: page.data.title ?? '',
      description: page.data.description ?? '',
      entry: data.entry,
      folderUrl: getFolderUrl(page.url),
    };
  });
}

function scoreCatalogPage(page: CatalogPage, term: string): number {
  const needle = normalizeForMatch(term);
  if (!needle) return 0;

  let score = 0;
  if (normalizeForMatch(page.title).includes(needle)) score += 12;
  if (page.entry && normalizeForMatch(page.entry).includes(needle)) score += 10;
  if (normalizeForMatch(page.description).includes(needle)) score += 6;
  if (normalizeForMatch(page.url).includes(needle)) score += 4;
  if (page.entry && normalizeForMatch(page.title).includes(needle)) score += 5;
  return score;
}

/** 从关键词推断平台/文档族（LLM 未输出 docFamilies 时的兜底） */
export function inferDocFamiliesFromKeywords(
  keywords: string[],
  locale?: string | null,
): string[] {
  const hubs = getCatalogPages(locale).filter(isConnectorPackHub);
  const families = new Set<string>();
  for (const kw of keywords) {
    for (const hub of hubs) {
      if (scoreCatalogPage(hub, kw) >= 12) families.add(hub.title);
    }
  }
  return [...families];
}

/** 仅保留能映射到连接器 hub 的文档族名称 */
export function validateDocFamilies(
  families: string[],
  locale?: string | null,
): string[] {
  const hubs = getCatalogPages(locale).filter(isConnectorPackHub);
  const validated = new Set<string>();
  for (const family of families) {
    for (const hub of hubs) {
      if (hub.title === family || scoreCatalogPage(hub, family) >= 12) {
        validated.add(hub.title);
      }
    }
  }
  return [...validated];
}

export function hitSearchText(hit: SearchHitWithKeywords): string {
  const raw = String(hit.content ?? '').replace(/<[^>]+>/g, '');
  return `${raw} ${(hit.breadcrumbs ?? []).join(' ')} ${hit.url.split('/').pop() ?? ''}`;
}

export function scoreTopicHit(hit: SearchHitWithKeywords, topicKeywords: string[]): number {
  if (topicKeywords.length === 0) return 0;
  const haystack = normalizeForMatch(hitSearchText(hit));
  let points = 0;
  for (const kw of topicKeywords) {
    const needle = normalizeForMatch(kw);
    if (!needle) continue;
    if (haystack.includes(needle)) points += 3;
    if (hit.matchedKeywords.includes(kw)) points += 2;
    if (needle.includes('发布') && haystack.includes('发布')) points += 1;
    if (needle.includes('上架') && haystack.includes('上架')) points += 1;
    if (needle.includes('商品') && haystack.includes('商品')) points += 1;
  }
  return points;
}

/** 连接器平台级 hub（如 /docs/RPA_QIANNIU） */
export function isConnectorPackHubUrl(url: string): boolean {
  return /^\/docs\/RPA_[A-Z0-9_]+$/.test(url);
}

/**
 * 有明确业务主题时收紧结果：排除 hub 页、排除仅命中平台词的结果、
 * 要求标题/面包屑含主题词（避免正文索引误命中）。
 */
export function filterHitsByTopicScope(
  hits: SearchHitWithKeywords[],
  topicKeywords: string[],
): SearchHitWithKeywords[] {
  if (topicKeywords.length === 0) return hits;

  return hits.filter((hit) => {
    if (hit.type === 'page' && isConnectorPackHubUrl(hit.url)) return false;

    const matchedTopicKeyword = hit.matchedKeywords.some((k) => topicKeywords.includes(k));
    if (!matchedTopicKeyword) return false;

    if (hit.type === 'page') {
      return titleMatchesTopicKeywords(hit, topicKeywords);
    }

    return scoreTopicHit(hit, topicKeywords) >= 3;
  });
}

function resolveExpandFolderUrl(best: CatalogPage, catalog: CatalogPage[]): string {
  if (isConnectorPackHub(best)) return best.url;

  if (/\/RPA_[A-Z0-9_]+\//.test(best.url) || /\/RPA_[A-Z0-9_]+$/.test(best.url)) {
    const hub = catalog.find((p) => p.url === best.folderUrl && isConnectorPackHub(p));
    if (hub) return hub.url;
  }

  return best.folderUrl;
}

function isConnectorPackHub(page: CatalogPage): boolean {
  if (!page.entry || !isConnectorPackHubUrl(page.url)) return false;
  // 平台级 hub（如 /docs/RPA_QIANNIU）；子连接器 URL 含更深路径，不应作为目录扩展根
  return true;
}

function isValidExpandFolderUrl(folderUrl: string, catalog: CatalogPage[]): boolean {
  const hub = catalog.find((p) => p.url === folderUrl);
  return Boolean(hub && isConnectorPackHub(hub));
}

/** 将 docFamilies（连接器包/产品族名称）解析为需展开的目录前缀 */
export function resolveDocFamilyFolderUrls(
  docFamilies: string[],
  locale?: string | null,
): Map<string, string> {
  const catalog = getCatalogPages(locale);
  const hubs = catalog.filter(isConnectorPackHub);
  const folderToFamily = new Map<string, string>();

  for (const family of docFamilies) {
    const exactHub = hubs.find((h) => h.title === family);
    if (exactHub) {
      folderToFamily.set(exactHub.url, family);
      continue;
    }

    let best: CatalogPage | null = null;
    let bestScore = 0;

    for (const page of hubs) {
      const score = scoreCatalogPage(page, family);
      if (score > bestScore) {
        bestScore = score;
        best = page;
      }
    }

    if (!best || bestScore < 6) continue;

    const folderUrl = resolveExpandFolderUrl(best, catalog);
    if (!isValidExpandFolderUrl(folderUrl, catalog)) continue;
    folderToFamily.set(folderUrl, family);
  }

  return folderToFamily;
}

function getBreadcrumbsForPage(page: CatalogPage): string[] {
  const fromTree = findBreadcrumbs(source.getPageTree(page.page.locale), page.url);
  if (fromTree && fromTree.length > 0) return fromTree;
  if (page.entry && page.url.includes('/connectors/') && isConnectorPackHub(page)) {
    return ['Docs', 'RPA 连接器', page.title];
  }
  return fromTree ?? [];
}

function toPageHit(page: CatalogPage, matchedKeyword: string): SearchHitWithKeywords {
  return {
    id: page.url,
    type: 'page',
    content: page.title,
    breadcrumbs: getBreadcrumbsForPage(page),
    url: page.url,
    matchedKeywords: [matchedKeyword],
  };
}

/** 展开某连接器目录下的全部页面（含 index 与子页） */
export function expandFolderUrlsToHits(
  folderToFamily: Map<string, string>,
  locale?: string | null,
): SearchHitWithKeywords[] {
  if (folderToFamily.size === 0) return [];

  const catalog = getCatalogPages(locale);
  const hits: SearchHitWithKeywords[] = [];

  for (const page of catalog) {
    for (const [folderUrl, family] of folderToFamily) {
      if (page.url !== folderUrl && !page.url.startsWith(`${folderUrl}/`)) continue;
      hits.push(toPageHit(page, family));
      break;
    }
  }

  return hits;
}

/** 从关键词检索命中的 hub/子页推断需展开的连接器目录 */
export function inferFolderUrlsFromKeywordHits(
  hits: SortedResult[],
  locale?: string | null,
): Map<string, string> {
  const catalog = getCatalogPages(locale);
  const urlToPage = new Map(catalog.map((p) => [p.url, p]));
  const folderToFamily = new Map<string, string>();

  for (const hit of hits) {
    if (hit.type !== 'page') continue;
    const page = urlToPage.get(hit.url);
    if (!page) continue;

    if (isConnectorPackHub(page)) {
      folderToFamily.set(page.url, page.title);
      continue;
    }

    if (!page.url.includes('/connectors/rpa-conn-')) continue;
    const folderUrl = page.folderUrl;
    const hub = urlToPage.get(folderUrl);
    if (hub && isConnectorPackHub(hub)) {
      folderToFamily.set(folderUrl, hub.title);
    }
  }

  for (const [folderUrl] of [...folderToFamily]) {
    if (!isValidExpandFolderUrl(folderUrl, catalog)) folderToFamily.delete(folderUrl);
  }

  return folderToFamily;
}

/** 目录扩展结果优先，同目录内 hub 置顶，其余按标题排序 */
export function rankAiSearchHits(
  hits: SearchHitWithKeywords[],
  expandedFolderUrls: Set<string>,
): SearchHitWithKeywords[] {
  const deduped = new Map<string, SearchHitWithKeywords>();
  for (const hit of hits) {
    const existing = deduped.get(hit.id);
    if (!existing) {
      deduped.set(hit.id, hit);
      continue;
    }
    for (const kw of hit.matchedKeywords) {
      if (!existing.matchedKeywords.includes(kw)) existing.matchedKeywords.push(kw);
    }
  }

  const isInExpandedFolder = (url: string) =>
    [...expandedFolderUrls].some((folder) => url === folder || url.startsWith(`${folder}/`));

  const list = [...deduped.values()];
  list.sort((a, b) => {
    const aExpanded = isInExpandedFolder(a.url);
    const bExpanded = isInExpandedFolder(b.url);
    if (aExpanded !== bExpanded) return aExpanded ? -1 : 1;

    const aHub = expandedFolderUrls.has(a.url);
    const bHub = expandedFolderUrls.has(b.url);
    if (aHub !== bHub) return aHub ? -1 : 1;

    return String(a.content).localeCompare(String(b.content), 'zh-CN');
  });

  return list;
}
