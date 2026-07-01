import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs/access/docs-access-effective';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { docsImageRoute } from '@/lib/core/shared';
import { source } from '@/lib/docs/source/source';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OG_VARIANTS = new Set(['image.png', 'poster.png', 'cover.png', 'quote.png']);

export function isOgDocsPath(pathname: string): boolean {
  return pathname.startsWith(`${docsImageRoute}/`) && pathname.endsWith('.png');
}

function parseOgSlug(pathname: string): string[] | null {
  if (!isOgDocsPath(pathname)) return null;
  const rest = pathname.slice(`${docsImageRoute}/`.length);
  if (!rest) return null;
  return rest.split('/').filter(Boolean);
}

/** 公开文档 OG 可跳过 Cube SSO 全局门禁（页级 private 仍由 applyOgDocGate 拦截） */
export function isPublicOgDocsPath(pathname: string): boolean {
  const slug = parseOgSlug(pathname);
  if (!slug || slug.length < 1) return false;
  const fileName = slug[slug.length - 1];
  if (!OG_VARIANTS.has(fileName) || fileName === 'quote.png') return false;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) return false;
  return getEffectiveDocAccess(page) !== 'private';
}

/**
 * 页级私有文档 OG 门禁。公开页放行；私有页需 Cookie/Bearer/SSO。
 * quote.png 验签在 route handler，此处仅放行。
 */
export function applyOgDocGate(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const slug = parseOgSlug(pathname);
  if (!slug || slug.length < 1) return null;

  const fileName = slug[slug.length - 1];
  if (!OG_VARIANTS.has(fileName)) return null;

  if (fileName === 'quote.png') return null;

  const page = source.getPage(slug.slice(0, -1));
  if (!page) return new NextResponse(null, { status: 404 });

  if (getEffectiveDocAccess(page) !== 'private') return null;

  const access = getDocAccessContext(request);
  if (!isDocPageAccessible(page, access)) {
    return new NextResponse(null, { status: 404 });
  }

  return null;
}
