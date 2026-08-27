import { docsImageRoute } from '@/lib/core/shared';

/**
 * cover URL 版本戳: 在生成逻辑变更时递增, 强制浏览器绕过旧的 immutable 缓存;
 * (OG 路由曾用 max-age=1y + immutable, 占位图会被长期锁死)
 */
export const MODULE_COVER_CACHE_VERSION = '2';

export function buildPageCoverUrl(slugs: string[]): string {
  return `${docsImageRoute}/${[...slugs, 'cover.png'].join('/')}?v=${MODULE_COVER_CACHE_VERSION}`;
}

export type ModuleCoverResolveOptions = {
  /** :::category-filter 的 cover，默认 false */
  gridCover?: boolean;
  /** 单页覆盖：true 强制开，false 强制关 */
  cover?: boolean;
};

/**
 * 卡片封面 OG URL（可选）。
 * - 列表 `cover: false`（默认）→ 无 cover，除非页级 `cover: true`
 * - 列表 `cover: true` → 有 cover，除非页级 `cover: false`
 */
export function resolveModuleCoverUrl(
  slugs: string[],
  options: ModuleCoverResolveOptions = {},
): string | undefined {
  const gridCover = options.gridCover ?? false;
  const { cover } = options;

  if (cover === false) return undefined;
  if (cover === true) return buildPageCoverUrl(slugs);
  if (!gridCover) return undefined;

  return buildPageCoverUrl(slugs);
}
