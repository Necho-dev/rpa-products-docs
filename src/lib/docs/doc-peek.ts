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

/** 分屏打开默认 1:1 */
export const DEFAULT_PEEK_RATIO = 0.5;

/** 左:右 分栏预设，写入 peekRatio（仍夹在 0.28–0.72） */
export const PEEK_RATIO_PRESETS = [
  { label: '2:1', ratio: 2 / 3 },
  { label: '1:1', ratio: DEFAULT_PEEK_RATIO },
  { label: '1:2', ratio: 1 / 3 },
] as const;

export type DocPeekSurfaceKind = 'main' | 'peek';

/**
 * 主栏文档点击是否打开/覆盖右栏。
 * 右栏内链接始终走右栏栈。单栏正文 peek 开双栏；单栏卡片走整页。
 * 双栏未锁定（导航）：主栏选择覆盖右栏。双栏已锁定（对照）：主栏选择改左栏。
 */
export function shouldPeekDocsLink(input: {
  splitOpen: boolean;
  surface: DocPeekSurfaceKind;
  onlyWhenSplit?: boolean;
  pinned?: boolean;
}): boolean {
  if (input.surface === 'peek') return true;
  if (!input.splitOpen) return !input.onlyWhenSplit;
  if (input.pinned) return false;
  return true;
}

export function buildPeekShareUrl(
  origin: string,
  leftPath: string,
  leftHash: string,
  right: DocPeekTarget,
): string {
  const url = new URL(origin);
  url.pathname = stripTrailingSlash(leftPath);
  url.search = '';
  url.searchParams.set('peek', encodePeekTarget(right.path, right.hash));
  const hash = leftHash.startsWith('#') ? leftHash.slice(1) : leftHash;
  url.hash = hash;
  return url.toString();
}

export type DocShareLinks = {
  /** 当前这篇文档自己的地址，与分享图、二维码一致 */
  pageUrl: string;
  /** 双栏对比地址；未开双栏时为 null */
  compareUrl: string | null;
};

/**
 * 单页链接与双栏对比链接分开返回，避免分享面板把两者混成一条。
 * 对比链接沿用 pageUrl 的 origin，保证与二维码指向同一站点。
 */
export function resolveDocShareLinks(input: {
  pageUrl: string;
  leftPath: string;
  leftHash: string;
  peekTarget: DocPeekTarget | null;
  splitOpen: boolean;
}): DocShareLinks {
  const { pageUrl, leftPath, leftHash, peekTarget, splitOpen } = input;
  if (!splitOpen || !peekTarget) return { pageUrl, compareUrl: null };

  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return { pageUrl, compareUrl: null };
  }

  const compareUrl = buildPeekShareUrl(origin, leftPath, leftHash, peekTarget);
  return { pageUrl, compareUrl: compareUrl === pageUrl ? null : compareUrl };
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

/* 是否用 cookie 在服务端渲染右栏，用于 RSC 刷新 */
export function shouldRenderPeekFromCookie(headerList: {
  get(name: string): string | null;
}): boolean {
  if (headerList.get('next-router-prefetch') === '1') return false;
  const dest = (headerList.get('sec-fetch-dest') ?? '').toLowerCase();
  if (dest === 'document' || dest === 'iframe') return false;
  return true;
}

export { docsRoute };
