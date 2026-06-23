import { docsImageRoute } from '@/lib/core/shared';

export function buildPageCoverUrl(slugs: string[]): string {
  return `${docsImageRoute}/${[...slugs, 'cover.png'].join('/')}`;
}

export type ModuleCoverResolveOptions = {
  /** :::module-grid 的 cover 配置，默认 false */
  gridCover?: boolean;
  /** 单页 frontmatter moduleCover，可覆盖 grid 默认 */
  moduleCover?: boolean;
};

/**
 * ModuleGrid 卡片封面 OG URL（可选）。
 * - grid `cover: false`（默认）→ 无 cover，除非页级 `moduleCover: true`
 * - grid `cover: true` → 有 cover，除非页级 `moduleCover: false`
 */
export function resolveModuleCoverUrl(
  slugs: string[],
  options: ModuleCoverResolveOptions = {},
): string | undefined {
  const gridCover = options.gridCover ?? false;
  const { moduleCover } = options;

  if (moduleCover === false) return undefined;
  if (moduleCover === true) return buildPageCoverUrl(slugs);
  if (!gridCover) return undefined;

  return buildPageCoverUrl(slugs);
}
