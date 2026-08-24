import { isDocPageAccessible, resolveDocPage } from '@/lib/docs/docs-site-tools';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { getPageCover } from '@/lib/docs/source/source';

export type LinkPreviewOk = {
  ok: true;
  title: string;
  description: string | null;
  coverUrl: string;
  url: string;
};

export type LinkPreviewResult =
  | LinkPreviewOk
  | { ok: false; status: 400 | 403 | 404; error: string };

export function getLinkPreview(
  path: string,
  access: DocAccessContext,
): LinkPreviewResult {
  const trimmed = path.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: 'path required' };
  }

  const page = resolveDocPage(trimmed);
  if (!page) {
    return { ok: false, status: 404, error: 'not found' };
  }

  if (!isDocPageAccessible(page, access)) {
    return { ok: false, status: 403, error: 'forbidden' };
  }

  return {
    ok: true,
    title: page.data.title ?? '',
    description: page.data.description?.trim() || null,
    coverUrl: getPageCover(page).url,
    url: page.url,
  };
}
