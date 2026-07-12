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
import { createElement, type CSSProperties, type ReactElement } from 'react';
import { icons } from 'lucide-react';
import { getPlatformIconUrl } from '@/lib/docs/platform-favicon/manifest-store';
import { getSharedIconUrl } from '@/lib/docs/shared-icons/store';

// ─── 位图包裹元素（platform / shared 位图图标共用） ──────────────────────────

/**
 * 固定外框 + 尺寸，保证位图在侧栏、meta-panel 等处与 Lucide SVG 视觉一致。
 */
export function bitmapIconElement(src: string): ReactElement {
  return createElement(
    'span',
    {
      className:
        'inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-fd-border/80 bg-fd-card p-px',
      'aria-hidden': true,
    },
    createElement('img', {
      src,
      alt: '',
      width: 14,
      height: 14,
      className: 'size-full object-contain',
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
 * @param name  图标名，如 `DEWU`、`MyBrand`、`Bot`
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
