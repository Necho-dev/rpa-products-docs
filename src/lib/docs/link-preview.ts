import { isDocPageAccessible, resolveDocPage } from '@/lib/docs/docs-site-tools';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { resolveHeroImageRelativePathWithIncludes } from '@/lib/docs/og/hero-image';
import { getPageCover } from '@/lib/docs/source/source';

export type LinkPreviewOk = {
  ok: true;
  title: string;
  description: string | null;
  /** 无正文首图时为 null，浮窗不渲染预览区（避免 OG 占位图）。 */
  coverUrl: string | null;
  url: string;
};

export type LinkPreviewResult =
  | LinkPreviewOk
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function getLinkPreview(
  path: string,
  access: DocAccessContext,
): Promise<LinkPreviewResult> {
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

  let coverUrl: string | null = null;
  try {
    const raw = await page.data.getText('raw');
    const hero = await resolveHeroImageRelativePathWithIncludes(page.path, raw);
    if (hero) coverUrl = getPageCover(page).url;
  } catch {
    coverUrl = null;
  }

  return {
    ok: true,
    title: page.data.title ?? '',
    description: page.data.description?.trim() || null,
    coverUrl,
    url: page.url,
  };
}
