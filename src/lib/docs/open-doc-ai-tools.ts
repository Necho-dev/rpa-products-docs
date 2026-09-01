import { z } from 'zod';
import { docsRoute } from '@/lib/core/shared';
import { isDocsPathname, stripTrailingSlash } from '@/lib/docs/link-kind';

export const OPEN_DOC_CLIENT_TOOL_NAMES = ['openDocumentationPage'] as const;

export type OpenDocClientToolName = (typeof OPEN_DOC_CLIENT_TOOL_NAMES)[number];

export function isOpenDocClientToolName(name: string): name is OpenDocClientToolName {
  return (OPEN_DOC_CLIENT_TOOL_NAMES as readonly string[]).includes(name);
}

export const OpenDocumentationPageInputSchema = z.object({
  path: z
    .string()
    .describe(
      `Docs page path or full URL (e.g. "${docsRoute}/rpa/some-page" or with a heading hash).`,
    ),
  target: z
    .enum(['peek', 'main'])
    .optional()
    .describe(
      "Where to open after the user confirms. Default 'peek' uses the right dual-pane preview so the current article stays. 'main' navigates the left/main document. Never open without confirmation.",
    ),
});

export type OpenDocumentationPageInput = z.infer<typeof OpenDocumentationPageInputSchema>;

export const openDocumentationPageToolDescription = `Opens a documentation page in the user's browser.

WHEN TO USE: The user explicitly asks to open, jump to, or show a page whose path you already know.

WHEN NOT TO USE: To read or summarize content — use getDocumentationPage / getDocumentationPageMeta. Do not open a page merely to answer a question.

Requires on-screen user confirmation before any navigation. Prefer target=peek so the current page is not replaced. Do not assume success until the tool output confirms it.`;

export type OpenDocToolExecutors = {
  openDocumentationPage: (input: OpenDocumentationPageInput) => Promise<string>;
};

export function resolveOpenDocumentationHref(path: string): string | null {
  let raw = path.trim();
  if (!raw) return null;
  let hash = '';
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      raw = `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    return null;
  }
  const hashIndex = raw.indexOf('#');
  if (hashIndex >= 0) {
    hash = raw.slice(hashIndex);
    raw = raw.slice(0, hashIndex);
  }
  const pathOnly = stripTrailingSlash((raw.split('?')[0] ?? raw) || '/');
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  if (!isDocsPathname(normalized)) return null;
  return `${normalized}${hash}`;
}

export function createOpenDocToolExecutors(deps: {
  openPeek: ((href: string) => void) | null;
  openMain: (href: string) => void;
}): OpenDocToolExecutors {
  return {
    async openDocumentationPage(input) {
      const href = resolveOpenDocumentationHref(input.path);
      if (!href) {
        return JSON.stringify(
          {
            ok: false,
            error: 'Invalid path',
            message: '只能打开本站文档路径（/docs/...）',
            path: input.path,
          },
          null,
          2,
        );
      }

      const requested = input.target ?? 'peek';
      if (requested === 'peek' && deps.openPeek) {
        deps.openPeek(href);
        return JSON.stringify({ ok: true, path: href, opened: 'peek' }, null, 2);
      }

      deps.openMain(href);
      return JSON.stringify(
        {
          ok: true,
          path: href,
          opened: requested === 'peek' ? 'navigate' : 'main',
          note:
            requested === 'peek' && !deps.openPeek
              ? '当前没有右侧预览，已整页跳转。'
              : undefined,
        },
        null,
        2,
      );
    },
  };
}
