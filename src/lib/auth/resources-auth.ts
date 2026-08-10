import {
  isCubeSsoEnabled,
  resourcesPublicPrefixes,
  resourcesRequireEmbedSign,
} from '@/lib/auth/auth-config';
import { resolveAuthContext, type AuthContext } from '@/lib/auth/auth-core';
import { verifyResourceRequest } from '@/lib/auth/sign-resource';

export type ResourceAuthVia = 'open' | 'public' | 'hmac' | 'session';

export type ResourceAuthResult =
  | { ok: true; via: ResourceAuthVia }
  | { ok: false };

export type AuthorizeDocsImageDeps = {
  requireEmbedSign?: () => boolean;
  isSsoEnabled?: () => boolean;
  publicPrefixes?: () => string[];
  verifyHmac?: (request: Request) => boolean;
  resolveAuth?: (request: Request) => AuthContext;
};

/**
 * 文档配图 `/resources/images/**` 鉴权：
 *
 * - 未开启 embed 验签（多为本地）：直接放行
 * - 开启后拒绝匿名，允许：
 *   1. 公开前缀（内置 `_public/_shared`）
 *   2. 嵌入 BFF HMAC（`docsResources` 回源）
 *   3. 浏览器 Session Cookie（如 `/llms.mdx` 配图）
 *
 * MCP 读图走 `get_docs_image`（磁盘），不依赖本路由的 Bearer。
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
  const verifyHmac = deps.verifyHmac ?? verifyResourceRequest;
  const resolveAuth = deps.resolveAuth ?? resolveAuthContext;

  if (!requireEmbedSign()) {
    return { ok: true, via: 'open' };
  }

  if (isPublicResourceRelativePath(relativePath, publicPrefixes())) {
    return { ok: true, via: 'public' };
  }

  // 嵌入回源：必须优先于 Cookie，避免 BFF 无会话时被误拒
  if (verifyHmac(request)) {
    return { ok: true, via: 'hmac' };
  }

  const auth = resolveAuth(request);
  if (auth.session && !auth.sessionNeedsReauth) {
    return { ok: true, via: 'session' };
  }

  // SSO 关闭但强制 REQUIRE_EMBED_SIGN 时（本地调试），不拦截匿名
  if (!isSsoEnabled() && auth.isAuthenticated) {
    return { ok: true, via: 'open' };
  }

  return { ok: false };
}
