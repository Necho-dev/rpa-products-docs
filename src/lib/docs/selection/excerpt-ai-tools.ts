import { z } from 'zod';
import { docsRoute } from '@/lib/core/shared';
import {
  applyHighlightFromRange,
  unwrapHighlightMark,
} from '@/lib/docs/selection/apply-highlights';
import { findProseContainer } from '@/lib/docs/selection/get-selection-in-container';
import {
  createHighlight,
  idbDeleteHighlight,
  idbFindHighlightByQuote,
  idbGetHighlightById,
  idbListAllHighlights,
  idbPutHighlight,
  type DocHighlight,
} from '@/lib/docs/selection/highlight-idb';

const DEFAULT_LIMIT = 20;
const MAX_EXACT_PREVIEW = 120;

export const EXCERPT_CLIENT_TOOL_NAMES = [
  'listExcerpts',
  'searchExcerpts',
  'addExcerpt',
  'deleteExcerpt',
] as const;

export type ExcerptClientToolName = (typeof EXCERPT_CLIENT_TOOL_NAMES)[number];

export function isExcerptClientToolName(name: string): name is ExcerptClientToolName {
  return (EXCERPT_CLIENT_TOOL_NAMES as readonly string[]).includes(name);
}

export const ListExcerptsInputSchema = z.object({
  pagePath: z
    .string()
    .optional()
    .describe(`Optional docs page path filter (e.g. "${docsRoute}/some/page").`),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe(`Max items to return (default ${DEFAULT_LIMIT}, max 50).`),
});

export const SearchExcerptsInputSchema = z.object({
  query: z.string().min(1).describe('Keyword to match in excerpt text or page title.'),
  limit: z
    .coerce.number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe(`Max items to return (default ${DEFAULT_LIMIT}, max 50).`),
});

export const AddExcerptInputSchema = z.object({
  exact: z
    .string()
    .optional()
    .describe('Quoted text to save. Prefer the user selection in Client Context when present.'),
  prefix: z.string().optional().describe('Optional quote prefix context (~32 chars).'),
  suffix: z.string().optional().describe('Optional quote suffix context (~32 chars).'),
  pagePath: z
    .string()
    .optional()
    .describe(`Docs page path when no selection context (defaults to current page).`),
});

export const DeleteExcerptInputSchema = z.object({
  id: z.string().uuid().describe('Highlight id from listExcerpts or searchExcerpts.'),
});

export const listExcerptsToolDescription = `Lists the user's saved excerpts (highlights) stored locally in this browser.

WHEN TO USE: User asks what excerpts/highlights they saved, or wants an overview of their collection.

Returns id, pagePath, pageTitle, excerpt preview, and createdAt. Does not bypass document access control — excerpts only reference pages the user could open while logged in.`;

export const searchExcerptsToolDescription = `Searches saved excerpts by keyword in excerpt text or page title.

WHEN TO USE: User asks to find a saved quote containing specific words or from a specific doc title.`;

export const addExcerptToolDescription = `Adds a new excerpt to the user's local collection in this browser.

WHEN TO USE: User asks to save/highlight selected text or a quoted passage.

Prefer Client Context selection when present. Otherwise use exact/prefix/suffix and pagePath. If the quote cannot be located in page content, return a clear error — do not silently fail.`;

export const deleteExcerptToolDescription = `Deletes a saved excerpt by id.

WHEN TO USE: User explicitly asks to remove a saved excerpt.

Requires user confirmation before deletion executes. Default to denial if the user does not confirm.`;

export type ListExcerptsInput = z.infer<typeof ListExcerptsInputSchema>;
export type SearchExcerptsInput = z.infer<typeof SearchExcerptsInputSchema>;
export type AddExcerptInput = z.infer<typeof AddExcerptInputSchema>;
export type DeleteExcerptInput = z.infer<typeof DeleteExcerptInputSchema>;

export type ExcerptSelectionContext = {
  text: string;
  pageUrl: string;
  pageTitle?: string;
};

export type ExcerptToolDeps = {
  getPagePath: () => string | null;
  getSelectionContext: () => ExcerptSelectionContext | null;
  refreshCollection: () => Promise<void>;
};

export type ExcerptToolExecutors = {
  listExcerpts: (input: ListExcerptsInput) => Promise<string>;
  searchExcerpts: (input: SearchExcerptsInput) => Promise<string>;
  addExcerpt: (input: AddExcerptInput) => Promise<string>;
  deleteExcerpt: (input: DeleteExcerptInput) => Promise<string>;
};

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncateExact(text: string, max = MAX_EXACT_PREVIEW): string {
  const normalized = normalizeSpaces(text);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toISOString();
  } catch {
    return String(ms);
  }
}

function pagePathFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    if (pathname === `${docsRoute}/access`) return null;
    if (pathname === docsRoute || pathname.startsWith(`${docsRoute}/`)) {
      return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

function normalizePagePath(path: string): string {
  let p = path.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) {
    p = new URL(p).pathname;
  }
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function serializeExcerpt(h: DocHighlight) {
  return {
    id: h.id,
    pagePath: h.pagePath,
    pageTitle: h.pageTitle ?? null,
    exact: truncateExact(h.exact),
    createdAt: formatDate(h.createdAt),
  };
}

export async function executeListExcerpts(
  input: ListExcerptsInput,
  _deps: ExcerptToolDeps,
): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), 50);
  let list = await idbListAllHighlights();

  if (input.pagePath?.trim()) {
    const filterPath = normalizePagePath(input.pagePath);
    list = list.filter((h) => h.pagePath === filterPath);
  }

  const total = list.length;
  const items = list.slice(0, limit).map(serializeExcerpt);

  return JSON.stringify(
    {
      total,
      returned: items.length,
      excerpts: items,
    },
    null,
    2,
  );
}

export async function executeSearchExcerpts(
  input: SearchExcerptsInput,
  _deps: ExcerptToolDeps,
): Promise<string> {
  const query = input.query.trim().toLowerCase();
  if (!query) {
    return JSON.stringify({ error: 'Query is empty' }, null, 2);
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), 50);
  const all = await idbListAllHighlights();
  const matched = all.filter((h) => {
    const haystack = `${h.exact}\n${h.pageTitle ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });

  const items = matched.slice(0, limit).map(serializeExcerpt);

  return JSON.stringify(
    {
      query: input.query.trim(),
      total: matched.length,
      returned: items.length,
      excerpts: items,
    },
    null,
    2,
  );
}

export async function executeAddExcerpt(
  input: AddExcerptInput,
  deps: ExcerptToolDeps,
): Promise<string> {
  const selection = deps.getSelectionContext();
  let exact = normalizeSpaces(selection?.text ?? input.exact ?? '');
  let prefix = normalizeSpaces(input.prefix ?? '');
  let suffix = normalizeSpaces(input.suffix ?? '');
  let pagePath =
    (selection ? pagePathFromUrl(selection.pageUrl) : null) ??
    (input.pagePath ? normalizePagePath(input.pagePath) : null) ??
    deps.getPagePath();
  const pageTitle = selection?.pageTitle ?? undefined;

  if (!exact) {
    return JSON.stringify(
      { error: 'Missing excerpt text', message: 'Provide exact text or ask the user to select text first.' },
      null,
      2,
    );
  }

  if (!pagePath) {
    return JSON.stringify(
      { error: 'Missing page path', message: 'Could not determine docs page path for this excerpt.' },
      null,
      2,
    );
  }

  const existing = await idbFindHighlightByQuote(pagePath, exact, prefix, suffix);
  if (existing) {
    return JSON.stringify(
      {
        ok: true,
        duplicate: true,
        message: 'This excerpt already exists.',
        excerpt: serializeExcerpt(existing),
      },
      null,
      2,
    );
  }

  const highlight = createHighlight({
    pagePath,
    pageTitle,
    exact,
    prefix,
    suffix,
    color: 'yellow',
  });

  await idbPutHighlight(highlight);

  const currentPagePath = deps.getPagePath();
  if (currentPagePath === pagePath) {
    const container = findProseContainer();
    if (container) {
      const applied = applyHighlightFromRange(container, highlight);
      if (!applied) {
        await idbDeleteHighlight(highlight.id);
        await deps.refreshCollection();
        return JSON.stringify(
          {
            error: 'Quote not found',
            message: 'Could not locate this text in the current page content. The excerpt was not saved.',
            pagePath,
            exact: truncateExact(exact),
          },
          null,
          2,
        );
      }
    }
  }

  await deps.refreshCollection();

  return JSON.stringify(
    {
      ok: true,
      message: 'Excerpt saved.',
      excerpt: serializeExcerpt(highlight),
    },
    null,
    2,
  );
}

export async function executeDeleteExcerpt(
  input: DeleteExcerptInput,
  deps: ExcerptToolDeps,
): Promise<string> {
  const highlight = await idbGetHighlightById(input.id);
  if (!highlight) {
    return JSON.stringify({ error: 'Not found', id: input.id }, null, 2);
  }

  await idbDeleteHighlight(highlight.id);

  const currentPagePath = deps.getPagePath();
  if (currentPagePath === highlight.pagePath) {
    const container = findProseContainer();
    container
      ?.querySelectorAll(`[data-doc-highlight="${highlight.id}"]`)
      .forEach((el) => unwrapHighlightMark(el));
  }

  await deps.refreshCollection();

  return JSON.stringify(
    {
      ok: true,
      message: 'Excerpt deleted.',
      deleted: serializeExcerpt(highlight),
    },
    null,
    2,
  );
}

export function createExcerptToolExecutors(deps: ExcerptToolDeps): ExcerptToolExecutors {
  return {
    listExcerpts: (input) => executeListExcerpts(input, deps),
    searchExcerpts: (input) => executeSearchExcerpts(input, deps),
    addExcerpt: (input) => executeAddExcerpt(input, deps),
    deleteExcerpt: (input) => executeDeleteExcerpt(input, deps),
  };
}
