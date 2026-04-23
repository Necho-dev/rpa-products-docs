import { z } from 'zod';
import type { DocAccessContext } from '@/lib/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs-access-effective';
import { getDocsSearchApi } from '@/lib/docs-search-server';
import { getLLMText, source } from '@/lib/source';
import { docsRoute } from '@/lib/shared';

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

export const listPagesToolDescription = `Lists all available documentation pages with their categories and basic information.

WHEN TO USE: Use this tool when you need to EXPLORE or SEARCH for documentation about a topic but don't know the exact page path.

WHEN NOT TO USE: If you already know the specific page path (e.g. "${docsRoute}/getting-started"), use getDocumentationPage directly instead.

WORKFLOW: Returns title, description, and path (page URL). Then use getDocumentationPage for full content.`;

export const getPageToolDescription = `Retrieves the full content and details of a specific documentation page.

WHEN TO USE: When you know the EXACT docs URL path (e.g. "${docsRoute}/some/page").

WHEN NOT TO USE: If you don't know the path, use listDocumentationPages first.

Returns title, description, path, url, and content (processed markdown / LLM-oriented text).`;

export type DocToolTextResult = { ok: true; text: string } | { ok: false; text: string };

export async function listDocumentationPages(
  siteOrigin: string,
  locale: string | undefined,
  access: DocAccessContext,
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

  pages = pages.filter((p) => isDocPageAccessible(p, access));

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

  const content = await getLLMText(page);
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
});

export const GetDocumentationPageInputSchema = z.object({
  path: z
    .string()
    .describe(
      `Docs page path or full URL (e.g. "${docsRoute}/index" or full URL ending with that path).`,
    ),
});

export const searchDocsToolDescription = `Full-text search over the documentation index (Orama, same engine as the site search bar).

WHEN TO USE: User asks open-ended questions, keywords, or topics without a known page path.

WHEN NOT TO USE: If you already have an exact path, prefer get-documentation-page or get-page-meta.

Returns ranked hits with url, type (page/heading/text), and snippet content.`;

export const getPageMetaToolDescription = `Returns page metadata and table of contents without the full body (token-efficient).

WHEN TO USE: You need structure, headings, or links before loading full content.

WHEN NOT TO USE: When you need the complete document text — use get-documentation-page.`;

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
});

export const GetDocumentationPageMetaInputSchema = GetDocumentationPageInputSchema;

export async function searchDocumentation(
  siteOrigin: string,
  query: string,
  options: { locale?: string | null; limit?: number } | undefined,
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
  let results = await getDocsSearchApi().search(q, {
    locale: options?.locale ?? null,
    limit,
  });

  results = filterSearchHitsByDocAccess(results, access);

  const base = siteOrigin.replace(/\/$/, '');
  const list = results.map((r) => ({
    id: r.id,
    type: r.type,
    url: `${base}${r.url}`,
    path: r.url,
    content: typeof r.content === 'string' ? r.content : String(r.content),
    breadcrumbs: r.breadcrumbs,
  }));

  return { ok: true, text: JSON.stringify({ query: q, results: list }, null, 2) };
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
  const data = page.data as {
    toc?: unknown;
    lastModified?: string | Date;
  };

  const payload = {
    title: page.data.title,
    description: page.data.description,
    path: page.url,
    url: `${base}${page.url}`,
    toc: data.toc ?? null,
    lastModified: data.lastModified ?? null,
  };

  return { ok: true, text: JSON.stringify(payload, null, 2) };
}
