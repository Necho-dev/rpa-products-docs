import { docsRoute } from '@/lib/core/shared';

export type LinkKind = 'hash' | 'external' | 'docs' | 'same-origin-other';

const ACCESS_PATH = `${docsRoute}/access`;

export function isExternalHref(href: string): boolean {
  return /^\w+:/.test(href) || href.startsWith('//');
}

/** 纯页内锚点（`#` / `#section`）；`#/path` 不当作纯锚点 */
export function isPureHashHref(href: string | undefined): boolean {
  if (!href || href === '#') return true;
  if (!href.startsWith('#')) return false;
  return !href.slice(1).includes('/');
}

export function isDocsPathname(pathname: string): boolean {
  const path = stripTrailingSlash(pathname || '/');
  if (path === ACCESS_PATH) return false;
  return path === docsRoute || path.startsWith(`${docsRoute}/`);
}

export function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname || '/';
}

export type ResolvedHref = {
  origin: string;
  pathname: string;
  search: string;
  hash: string;
  href: string;
};

export function resolveHref(href: string, pageUrl: string): ResolvedHref | null {
  try {
    const url = new URL(href, pageUrl);
    let hash = url.hash;
    try {
      hash = decodeURIComponent(hash);
    } catch {
      /* keep encoded */
    }
    return {
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash,
      href: url.href,
    };
  } catch {
    return null;
  }
}

export function classifyLink(href: string, pageUrl: string): LinkKind {
  if (isPureHashHref(href)) return 'hash';

  const resolved = resolveHref(href, pageUrl);
  if (!resolved) return 'external';

  let pageOrigin: string;
  try {
    pageOrigin = new URL(pageUrl).origin;
  } catch {
    return 'external';
  }

  if (resolved.origin !== pageOrigin) return 'external';

  if (isDocsPathname(resolved.pathname)) return 'docs';
  return 'same-origin-other';
}

export function docsPathAndHashFromHref(
  href: string,
  pageUrl: string,
): { path: string; hash: string } | null {
  if (classifyLink(href, pageUrl) !== 'docs') return null;
  const resolved = resolveHref(href, pageUrl);
  if (!resolved) return null;
  return {
    path: stripTrailingSlash(resolved.pathname),
    hash: resolved.hash,
  };
}
