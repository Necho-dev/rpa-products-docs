import { z } from 'zod';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs/access/docs-access-effective';
import { getDocsSearchApi } from '@/lib/docs/search/docs-search-server';
import type { SearchTag } from '@/lib/docs/search/search-tags';
import { filterSearchByScope, type SearchScope } from '@/lib/docs/search/search-utils';
import { getLLMText, source } from '@/lib/docs/source/source';
import { getPageBacklinks, getPageReferences } from '@/lib/docs/doc-references';
import { docsRoute } from '@/lib/core/shared';
import { matchesListPageFilters } from '@/lib/docs/list-page-filters';

/** referencedBy 截断上限，避免热门授权页把 meta payload 撑爆 */
const MAX_REFERENCED_BY = 20;

export function isDocPageAccessible(
  page: { data: { access?: string }; url: string },
  ctx: DocAccessContext,
): boolean {
  if (getEffectiveDocAccess(page) !== 'private') return true;
  return ctx.canAccessPrivate;
}

export function filterSearchHitsByDocAccess<T extends { url: string }>(
  results: T[],
  ctx: DocAccessContext,
): T[] {
  return results.filter((r) => {
    const page = resolveDocPage(r.url);
    if (!page) return true;
    return isDocPageAccessible(page, ctx);
  });
}

export function normalizeDocPath(path: string): string {
  let p = path.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) {
    p = new URL(p).pathname;
  }
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

export function resolveDocPage(path: string) {
  const pathname = normalizeDocPath(path);
  const candidates = [pathname, `${pathname}/`];
  for (const c of candidates) {
    const hit = source.getPageByHref(c);
    if (hit) return hit.page;
  }
  if (!pathname.startsWith(`${docsRoute}/`) && pathname !== docsRoute) {
    return undefined;
  }
  const slugs =
    pathname === docsRoute
      ? []
      : pathname.slice(docsRoute.length + 1).split('/').filter(Boolean);
  return source.getPage(slugs.length ? slugs : undefined);
}

export function buildListPagesToolDescription(searchTags: SearchTag[] = []): string {
  const tagHint =
    searchTags.length > 0
      ? ` Optional tag filters by documentation partition slug: ${searchTags
          .map((t) => `"${t.value}" (${t.label})`)
          .join(', ')}.`
      : ' Optional tag is the first URL segment under /docs (e.g. "rpa", "auth").';

  return `Lists documentation pages with title, description, and path.

WHEN TO USE: Explore or browse the catalog when you do not know an exact page path. Prefer tag and/or prefix to avoid dumping the entire site.

WHEN NOT TO USE: If you already know the specific page path (e.g. "${docsRoute}/getting-started"), use get_docs_content / get_docs_meta instead. If you have a keyword or topic, prefer search_docs.

Filters (combine with AND when both are set):
- tag: partition slug.${tagHint}
- prefix: docs path prefix (e.g. "${docsRoute}/rpa/RPA_QIANNIU") — includes that page and descendants.

WORKFLOW: Returns title, description, and path. Then use get_docs_meta or get_docs_content.`;
}

/** @deprecated Prefer buildListPagesToolDescription(getSearchTags()) */
export const listPagesToolDescription = buildListPagesToolDescription();

export { matchesListPageFilters } from '@/lib/docs/list-page-filters';

export const getPageToolDescription = `Retrieves the full content and details of a specific documentation page.

WHEN TO USE: When you know the EXACT docs URL path (e.g. "${docsRoute}/some/page").

WHEN NOT TO USE: If you don't know the path, use list_docs or search_docs first. If you only need headings/structure, use get_docs_meta (token-efficient).

Returns title, description, path, url, and content (processed markdown / LLM-oriented text).
Image src values are content/docs-relative paths (e.g. rpa/_public/images/foo.png), not HTTP URLs.`;

export type DocToolTextResult = { ok: true; text: string } | { ok: false; text: string };

export async function listDocumentationPages(
  siteOrigin: string,
  locale: string | undefined,
  access: DocAccessContext,
  filters?: { tag?: string | null; prefix?: string | null },
): Promise<DocToolTextResult> {
  const languages = source.getLanguages();
  let pages =
    locale && languages.length > 0
      ? (languages.find((e) => e.language === locale)?.pages ?? [])
      : source.getPages();

  if (locale && languages.length > 0 && pages.length === 0) {
    return {
      ok: false,
      text: JSON.stringify(
        {
          error: `No pages for locale "${locale}". Available: ${languages.map((l) => l.language).join(', ')}`,
          pages: [],
        },
        null,
        2,
      ),
    };
  }

  pages = pages.filter(
    (p) => isDocPageAccessible(p, access) && matchesListPageFilters(p.url, filters ?? {}),
  );

  const list = pages.map((page) => ({
    title: page.data.title,
    path: page.url,
    description: page.data.description,
    locale: page.locale,
    url: `${siteOrigin.replace(/\/$/, '')}${page.url}`,
  }));

  return { ok: true, text: JSON.stringify(list, null, 2) };
}

export async function getDocumentationPage(
  siteOrigin: string,
  path: string,
  access: DocAccessContext,
): Promise<DocToolTextResult> {
  const page = resolveDocPage(path);
  if (!page) {
    return {
      ok: false,
      text: JSON.stringify({ error: 'Page not found', path: normalizeDocPath(path) }, null, 2),
    };
  }

  if (!isDocPageAccessible(page, access)) {
    return {
      ok: false,
      text: JSON.stringify(
        {
          error: 'Forbidden',
          message:
            'This page is private. Provide Authorization: Bearer <token> or authenticate via the docs access page.',
          path: normalizeDocPath(path),
        },
        null,
        2,
      ),
    };
  }

  const content = await getLLMText(page, {
    siteOrigin,
    docsRelativeImagePaths: true,
  });
  const base = siteOrigin.replace(/\/$/, '');
  const payload = {
    title: page.data.title,
    path: page.url,
    description: page.data.description,
    content,
    url: `${base}${page.url}`,
  };

  return { ok: true, text: JSON.stringify(payload, null, 2) };
}

export const ListDocumentationPagesInputSchema = z.object({
  locale: z
    .string()
    .optional()
    .describe('When the site uses i18n, filter by language code (e.g. "en"). Otherwise ignored.'),
  tag: z
    .string()
    .optional()
    .describe(
      'Optional documentation partition slug (first URL segment under /docs, e.g. "rpa" or "auth"). Limits the catalog to that partition.',
    ),
  prefix: z
    .string()
    .optional()
    .describe(
      `Optional docs path prefix (e.g. "${docsRoute}/rpa/RPA_QIANNIU"). Returns that page and its descendants.`,
    ),
});

export const GetDocumentationPageInputSchema = z.object({
  path: z
    .string()
    .describe(
      `Docs page path or full URL (e.g. "${docsRoute}/index" or full URL ending with that path).`,
    ),
});

export function buildSearchDocsToolDescription(searchTags: SearchTag[] = []): string {
  const tagHint =
    searchTags.length > 0
      ? ` Optional tag filters by documentation partition slug: ${searchTags
          .map((t) => `"${t.value}" (${t.label})`)
          .join(', ')}.`
      : '';

  return `Full-text search over the documentation index (Orama, same engine as the site search bar).

WHEN TO USE: User asks open-ended questions, keywords, or topics without a known page path.

WHEN NOT TO USE: If you already have an exact path, prefer get_docs_content or get_docs_meta directly.

Returns ranked hits with url, type (page/heading/text), snippet content, and page metadata (entry, tags, badge) when available. Set scope='page' when you only need to know which documents match (no heading/text snippets).${tagHint}`;
}

/** @deprecated Prefer buildSearchDocsToolDescription(getSearchTags()) for partition-aware text */
export const searchDocsToolDescription = buildSearchDocsToolDescription();

export const getPageMetaToolDescription = `Returns page metadata and table of contents without the full body (token-efficient).

Always includes title, description, path, url, entry (technical id, e.g. rpa.conn.*), tags, badge (status label/color), toc, lastModified, and document relationships.

Connector / page schedule fields from frontmatter (null when unset; typical on RPA connector pages — do not invent a second tool for these):
- dataReady: when data is expected to be ready ({ time?, cycle?, description? })
- estimatedDuration: typical run duration ({ sec?, min?, hour?, description? })
- minInterval: recommended minimum interval between runs ({ sec?, min?, hour?, description? })

Relationships (both are access-filtered and may be empty arrays):
- references: pages this page points to, as { kind, path, title, badge?: { label, color? }, prompt?: { label, type } }. kind "dependency" is 前置依赖 (the target must be satisfied first, most often an authorization page); kind "fallback" is 备选方案 (switch here when this one fails). badge defaults to a four-character kind label (前置依赖 / 备选方案). prompt is an optional author-written hint whose type is info | warning | success | error.
- referencedBy: pages that explicitly point here, as { path, title }, capped at ${MAX_REFERENCED_BY}.

WHEN TO USE: Structure, headings, entry/badge, schedule (dataReady / estimatedDuration / minInterval), or prerequisites (references) before loading full content.

WHEN NOT TO USE: When you need the complete document text — use get_docs_content instead.`;

type DocPageMetaFields = {
  entry?: string;
  tags?: string[];
  badge?: { label: string; color?: string };
  toc?: unknown;
  lastModified?: string | Date;
  dataReady?: {
    time?: string;
    cycle?: string;
    description?: string;
  };
  estimatedDuration?: {
    sec?: number;
    min?: number;
    hour?: number;
    description?: string;
  };
  minInterval?: {
    sec?: number;
    min?: number;
    hour?: number;
    description?: string;
  };
};

function tocTitleToString(title: unknown): string {
  if (typeof title === 'string') return title;
  if (title == null) return '';
  if (typeof title === 'number' || typeof title === 'boolean') return String(title);
  if (Array.isArray(title)) return title.map(tocTitleToString).join('');
  if (typeof title === 'object' && 'props' in title) {
    const children = (title as { props?: { children?: unknown } }).props?.children;
    return tocTitleToString(children);
  }
  return '';
}

/** 将 Fumadocs TOC（标题可能为 React 节点）转为可 JSON 序列化的纯对象 */
function serializeTocForMeta(toc: unknown): { depth: number; url: string; title: string }[] | null {
  if (!Array.isArray(toc)) return null;
  return toc.map((item) => {
    const row = item as { depth?: number; url?: string; title?: unknown };
    return {
      depth: row.depth ?? 0,
      url: row.url ?? '',
      title: tocTitleToString(row.title),
    };
  });
}

export const SearchDocumentationInputSchema = z.object({
  query: z.string().min(2).describe('Search query (natural language or keywords).'),
  locale: z.string().optional().describe('Optional locale when the site uses i18n.'),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe('Max results (default 15, max 25).'),
  scope: z
    .enum(['full', 'page'])
    .optional()
    .describe(
      "Result granularity: 'full' (default) includes matching headings/text snippets for in-page navigation; 'page' returns at most one result per document (useful when you only need to know which documents match, not where).",
    ),
  tag: z
    .string()
    .optional()
    .describe(
      'Optional documentation partition slug (first URL segment under /docs, e.g. "rpa" or "auth"). Limits search to that partition.',
    ),
});

export const GetDocumentationPageMetaInputSchema = GetDocumentationPageInputSchema;

function enrichSearchHitMeta(path: string): {
  entry: string | null;
  tags: string[] | null;
  badge: { label: string; color?: string } | null;
  title: string | null;
  description: string | null;
} {
  const page = resolveDocPage(path);
  if (!page) {
    return { entry: null, tags: null, badge: null, title: null, description: null };
  }
  const data = page.data as DocPageMetaFields;
  return {
    entry: data.entry ?? null,
    tags: data.tags ?? null,
    badge: data.badge ?? null,
    title: page.data.title ?? null,
    description: page.data.description ?? null,
  };
}

export async function searchDocumentation(
  siteOrigin: string,
  query: string,
  options:
    | { locale?: string | null; limit?: number; scope?: SearchScope; tag?: string | null }
    | undefined,
  access: DocAccessContext,
): Promise<DocToolTextResult> {
  const q = query.trim();
  if (q.length < 2) {
    return {
      ok: false,
      text: JSON.stringify({ error: 'Query too short', minLength: 2 }, null, 2),
    };
  }

  const limit = Math.min(Math.max(options?.limit ?? 15, 1), 25);
  const tag = options?.tag?.trim() || undefined;
  let results = await getDocsSearchApi().search(q, {
    locale: options?.locale ?? null,
    limit,
    ...(tag ? { tag: [tag] } : {}),
  });

  results = filterSearchByScope(filterSearchHitsByDocAccess(results, access), options?.scope ?? 'full');

  const base = siteOrigin.replace(/\/$/, '');
  const list = results.map((r) => {
    const meta = enrichSearchHitMeta(r.url);
    return {
      id: r.id,
      type: r.type,
      url: `${base}${r.url}`,
      path: r.url,
      content: typeof r.content === 'string' ? r.content : String(r.content),
      breadcrumbs: r.breadcrumbs,
      title: meta.title,
      description: meta.description,
      entry: meta.entry,
      tags: meta.tags,
      badge: meta.badge,
    };
  });

  return {
    ok: true,
    text: JSON.stringify({ query: q, tag: tag ?? null, results: list }, null, 2),
  };
}

export async function getDocumentationPageMeta(
  siteOrigin: string,
  path: string,
  access: DocAccessContext,
): Promise<DocToolTextResult> {
  const page = resolveDocPage(path);
  if (!page) {
    return {
      ok: false,
      text: JSON.stringify({ error: 'Page not found', path: normalizeDocPath(path) }, null, 2),
    };
  }

  if (!isDocPageAccessible(page, access)) {
    return {
      ok: false,
      text: JSON.stringify(
        {
          error: 'Forbidden',
          message:
            'This page is private. Provide Authorization: Bearer <token> or authenticate via the docs access page.',
          path: normalizeDocPath(path),
        },
        null,
        2,
      ),
    };
  }

  const base = siteOrigin.replace(/\/$/, '');
  const data = page.data as DocPageMetaFields;

  const payload = {
    title: page.data.title,
    description: page.data.description,
    path: page.url,
    url: `${base}${page.url}`,
    entry: data.entry ?? null,
    tags: data.tags ?? null,
    badge: data.badge ?? null,
    toc: serializeTocForMeta(data.toc),
    lastModified: data.lastModified ?? null,
    dataReady: data.dataReady ?? null,
    estimatedDuration: data.estimatedDuration ?? null,
    minInterval: data.minInterval ?? null,
    // mode 是渲染轴，对 agent 没有信息量，不输出
    references: getPageReferences(page, access).map((reference) => ({
      kind: reference.kind,
      path: reference.url,
      title: reference.title,
      badge: reference.badge,
      ...(reference.prompt ? { prompt: reference.prompt } : {}),
    })),
    referencedBy: getPageBacklinks(page, access)
      .slice(0, MAX_REFERENCED_BY)
      .map((referrer) => ({ path: referrer.url, title: referrer.title })),
  };

  return { ok: true, text: JSON.stringify(payload, null, 2) };
}
