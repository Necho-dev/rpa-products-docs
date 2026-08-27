/**
 * Icons 统一入口（服务端 / server components）
 *
 * 三条图标体系按优先级自动路由：
 *   1. platform icons  — content/docs/_public/_shared/platform/icons.json
 *   2. shared icons    — content/docs/_public/_shared/shared-icons.json
 *   3. Lucide          — lucide-react
 *
 * 导出：
 *   resolveDocIcon(name, color?)  → ReactElement | undefined   （三条，含 Lucide）
 *   resolveIconAssetUrl(name)     → string | undefined         （位图两条，仅 URL）
 *   bitmapIconElement(src)        → ReactElement               （内部样式一致的图片包裹）
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement, type CSSProperties, type ReactElement } from 'react';
import { icons } from 'lucide-react';
import { getPlatformIconUrl } from '@/lib/docs/platform-favicon/manifest-store';
import { getSharedIconUrl } from '@/lib/docs/shared-icons/store';

const RESOURCES_IMAGES_PREFIX = '/resources/images/';

const iconTileClass =
  'inline-flex aspect-square size-[var(--docs-sidebar-icon,1.3125rem)] min-h-[var(--docs-sidebar-icon,1.3125rem)] min-w-[var(--docs-sidebar-icon,1.3125rem)] shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-fd-muted/70 p-0 box-border dark:bg-fd-secondary/90';

function sharedSvgDiskPath(src: string): string | undefined {
  const pathname = src.split('?')[0] ?? '';
  if (!pathname.toLowerCase().endsWith('.svg')) return undefined;
  if (!pathname.startsWith(RESOURCES_IMAGES_PREFIX)) return undefined;
  const rel = decodeURIComponent(pathname.slice(RESOURCES_IMAGES_PREFIX.length));
  if (!rel || rel.includes('..') || path.isAbsolute(rel)) return undefined;
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    'content',
    'docs',
    rel,
  );
}

function readInlineSharedSvg(src: string): string | undefined {
  const diskPath = sharedSvgDiskPath(src);
  if (!diskPath) return undefined;
  try {
    const raw = readFileSync(/* turbopackIgnore: true */ diskPath, 'utf8');
    if (/<script/i.test(raw)) return undefined;
    const markup = raw.replace(/^\uFEFF/, '').replace(/<\?xml[^>]*>\s*/i, '');
    if (!/<svg\b/i.test(markup)) return undefined;
    return markup.replace(
      /<svg\b/i,
      '<svg class="size-full" shape-rendering="geometricPrecision"',
    );
  } catch {
    return undefined;
  }
}

// ─── 位图包裹元素（platform / shared 位图图标共用） ──────────────────────────

/**
 * 圆角磁贴：浅灰 `background` 给透明 favicon 做对齐兜底；
 * 不透明 logo 铺满格子，不用内边距把图形挤小。
 * SVG 内联绘制，避免 `<img>` 按固定像素栅格后再缩小。
 */
export function bitmapIconElement(src: string): ReactElement {
  const inlineSvg = readInlineSharedSvg(src);

  return createElement(
    'span',
    {
      'data-platform-icon': '',
      className: iconTileClass,
      'aria-hidden': true,
      ...(inlineSvg ? { dangerouslySetInnerHTML: { __html: inlineSvg } } : {}),
    },
    inlineSvg
      ? undefined
      : createElement('img', {
          src,
          alt: '',
          className: 'size-full object-contain',
          draggable: false,
          decoding: 'async',
          width: 64,
          height: 64,
          referrerPolicy: 'no-referrer',
        }),
  );
}

// ─── 位图 URL 解析（platform + shared，无 Lucide） ───────────────────────────

/**
 * 按 icon name 查找站内位图 URL，自动路由：platform → shared。
 * 仅返回 URL，不含 Lucide。适用于 `<img src>` 等仅需 URL 的场景。
 */
export function resolveIconAssetUrl(
  name: string | undefined | null,
): string | undefined {
  const normalized = name?.trim();
  if (!normalized) return undefined;
  return getPlatformIconUrl(normalized) ?? getSharedIconUrl(normalized);
}

// ─── 完整三条路由（platform → shared → Lucide） ──────────────────────────────

/**
 * 解析 icon name → ReactElement，优先级：
 *   1. platform icons（位图）
 *   2. shared icons（位图）
 *   3. Lucide（SVG，可附 color）
 *
 * @param name  图标名，如 `ICO_DEWU`、`MyBrand`、`Bot`
 * @param color 可选颜色，仅对 Lucide 图标生效
 */
export function resolveDocIcon(
  name: string | undefined,
  color?: string,
): ReactElement | undefined {
  if (!name) return undefined;

  const assetUrl = resolveIconAssetUrl(name);
  if (assetUrl) return bitmapIconElement(assetUrl);

  const Icon = icons[name as keyof typeof icons];
  if (!Icon) {
    console.warn(`[icons] Unknown: "${name}" (not in platform, shared, or Lucide)`);
    return undefined;
  }
  const style: CSSProperties | undefined = color ? { color } : undefined;
  return createElement(Icon, style ? { style } : null);
}
