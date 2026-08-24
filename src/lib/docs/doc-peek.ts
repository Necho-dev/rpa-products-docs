import { docsRoute } from '@/lib/core/shared';
import { classifyLink, isDocsPathname, stripTrailingSlash } from '@/lib/docs/link-kind';

/** 仅用于本次 RSC 请求带上右栏 path；整页刷新不恢复双栏 */
export const DOC_PEEK_COOKIE = 'fd_doc_peek';

export type DocPeekTarget = {
  path: string;
  hash: string;
};

export function parsePeekTarget(value: string | string[] | undefined): DocPeekTarget | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'string') return null;

  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep raw */
  }

  const hashIndex = decoded.indexOf('#');
  const pathPart = hashIndex === -1 ? decoded : decoded.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : decoded.slice(hashIndex);
  const pathOnly = pathPart.split('?')[0] ?? '';
  const path = stripTrailingSlash(pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`);

  if (!isDocsPathname(path)) return null;
  return { path, hash };
}

export function encodePeekTarget(path: string, hash = ''): string {
  const normalized = stripTrailingSlash(path);
  const h = hash.startsWith('#') || hash === '' ? hash : `#${hash}`;
  return `${normalized}${h}`;
}

export function writePeekCookie(target: DocPeekTarget | null): void {
  if (typeof document === 'undefined') return;
  if (!target) {
    document.cookie = `${DOC_PEEK_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const value = encodeURIComponent(encodePeekTarget(target.path, target.hash));
  document.cookie = `${DOC_PEEK_COOKIE}=${value}; Path=/; SameSite=Lax`;
}

export function canonicalDocsHref(path: string, hash = ''): string {
  const h = hash.startsWith('#') || hash === '' ? hash : `#${hash}`;
  return `${stripTrailingSlash(path)}${h}`;
}

export function isSameDocsPage(href: string, pageUrl: string, currentPathname: string): boolean {
  if (classifyLink(href, pageUrl) !== 'docs') return false;
  try {
    const url = new URL(href, pageUrl);
    return stripTrailingSlash(url.pathname) === stripTrailingSlash(currentPathname);
  } catch {
    return false;
  }
}

/** RSC 刷新才用 cookie 渲染右栏，刷新浏览器不恢复双栏 */
export function shouldRenderPeekFromCookie(headerList: {
  get(name: string): string | null;
}): boolean {
  if (headerList.get('next-router-prefetch') === '1') return false;
  return headerList.get('rsc') === '1';
}

export { docsRoute };
