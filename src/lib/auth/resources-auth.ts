import {
  isCubeSsoEnabled,
  resourcesPublicPrefixes,
  resourcesRequireEmbedSign,
} from '@/lib/auth/auth-config';
import { resolveAuthContext, type AuthContext } from '@/lib/auth/auth-core';
import { verifyResourceSignRequest } from '@/lib/auth/resource-sign';

export type ResourceAuthVia = 'open' | 'public' | 'sign' | 'session';

export type ResourceAuthResult =
  | { ok: true; via: ResourceAuthVia }
  | { ok: false };

export type AuthorizeDocsImageDeps = {
  requireEmbedSign?: () => boolean;
  isSsoEnabled?: () => boolean;
  publicPrefixes?: () => string[];
  verifySign?: (request: Request) => boolean;
  resolveAuth?: (request: Request) => AuthContext;
};

/**
 * 文档配图 `/resources/images/**` 鉴权：
 *
 * - 未开启 embed 验签 (多为本地): 直接放行
 * - 开启后拒绝匿名, 允许:
 *   1. 公开前缀 (内置 _public/_shared)
 *   2. 文档站签发的 ?sign= (短时, 过期失效)
 *   3. 浏览器 Session Cookie
 */
export function isPublicResourceRelativePath(
  relative: string,
  prefixes: string[] = resourcesPublicPrefixes(),
): boolean {
  if (prefixes.length === 0) return false;
  const normalized = relative.replace(/^\/+/, '');
  return prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function authorizeDocsImageRequest(
  request: Request,
  relativePath: string,
  deps: AuthorizeDocsImageDeps = {},
): ResourceAuthResult {
  const requireEmbedSign = deps.requireEmbedSign ?? resourcesRequireEmbedSign;
  const isSsoEnabled = deps.isSsoEnabled ?? isCubeSsoEnabled;
  const publicPrefixes = deps.publicPrefixes ?? resourcesPublicPrefixes;
  const verifySign = deps.verifySign ?? verifyResourceSignRequest;
  const resolveAuth = deps.resolveAuth ?? resolveAuthContext;

  if (!requireEmbedSign()) {
    return { ok: true, via: 'open' };
  }

  if (isPublicResourceRelativePath(relativePath, publicPrefixes())) {
    return { ok: true, via: 'public' };
  }

  if (verifySign(request)) {
    return { ok: true, via: 'sign' };
  }

  const auth = resolveAuth(request);
  if (auth.session && !auth.sessionNeedsReauth) {
    return { ok: true, via: 'session' };
  }

  if (!isSsoEnabled() && auth.isAuthenticated) {
    return { ok: true, via: 'open' };
  }

  return { ok: false };
}
