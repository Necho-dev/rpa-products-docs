/**
 * Icons 统一入口（客户端 / client components）
 *
 * 三条图标体系按优先级自动路由：
 *   1. platform icons  — platform/icons.json（构建时静态 import）
 *   2. shared icons    — shared-icons.json（构建时静态 import）
 *   3. Lucide          — lucide-react
 *
 * 导出：
 *   resolveIconAssetUrl(name)    → string | undefined     （位图两条，仅 URL）
 *   renderBitmapIcon(src, cls?)  → ReactElement           （<img> 元素）
 *   renderDocIcon(name, props?)  → ReactElement | null    （三条，React 元素）
 */
'use client';

import { createElement, type CSSProperties, type ReactElement, type SVGProps } from 'react';
import * as LucideIcons from 'lucide-react';
import { LayoutGrid, Package, type LucideIcon } from 'lucide-react';
import type { PlatformIconManifest } from '@/lib/docs/platform-favicon/types';
import type { SharedIconManifest } from '@/lib/docs/shared-icons/types';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';
import { sharedResourceUrl } from '@/lib/docs/icons/shared-resource-url';
import platformManifest from '../../../../content/docs/_public/_shared/platform/icons.json';
import sharedManifest from '../../../../content/docs/_public/_shared/shared-icons.json';

const _platform = platformManifest as PlatformIconManifest;
const _shared = sharedManifest as SharedIconManifest;
const _lucide = LucideIcons as Record<string, unknown>;
const _lucideBlocklist = new Set(['createLucideIcon', 'useLucideContext']);

// ─── 工具 ────────────────────────────────────────────────────────────────────

function toIconName(name: string): string {
  const t = name.trim();
  if (!t.includes('-')) return t;
  return t.split('-').filter(Boolean).map((p) => p[0]!.toUpperCase() + p.slice(1)).join('');
}

function lookupLucideIcon(name: string): LucideIcon | undefined {
  const key = toIconName(name);
  if (_lucideBlocklist.has(key)) return undefined;
  const v = _lucide[key];
  if (typeof v === 'function') return v as LucideIcon;
  if (typeof v === 'object' && v && 'render' in v) return v as unknown as LucideIcon;
  return undefined;
}

// ─── 位图 URL 解析 ────────────────────────────────────────────────────────────

/**
 * 按 icon name 查找站内位图 URL（platform → shared）。
 */
export function resolveIconAssetUrl(
  name: string | undefined | null,
): string | undefined {
  const n = name?.trim();
  if (!n) return undefined;
  const pf = _platform.icons?.[n]?.file;
  if (pf) return sharedResourceUrl(pf);
  const sf = _shared.icons?.[n]?.file;
  if (sf) return sharedResourceUrl(sf);
  return undefined;
}

// ─── 位图 ReactElement ────────────────────────────────────────────────────────

export function renderBitmapIcon(src: string, className?: string): ReactElement {
  return createElement('img', {
    src,
    alt: '',
    className: className ?? 'size-3.5 object-contain',
    referrerPolicy: 'no-referrer',
    'aria-hidden': true,
  });
}

// ─── 完整三条路由 ──────────────────────────────────────────────────────────────

/**
 * 解析 icon name → ReactElement，优先级：platform → shared → Lucide。
 *
 * @param name   图标名，如 `DEWU`、`MyBrand`、`Bot`
 * @param props  透传给 Lucide SVG（如 `className`、`style`）
 * @param color  附加颜色，仅对 Lucide 有效
 */
export function renderDocIcon(
  name: string | undefined | null,
  props?: SVGProps<SVGSVGElement>,
  color?: string,
): ReactElement | null {
  const n = name?.trim();
  if (!n) return null;
  const url = resolveIconAssetUrl(n);
  if (url) return renderBitmapIcon(url, typeof props?.className === 'string' ? props.className : undefined);
  const Icon = lookupLucideIcon(n);
  if (!Icon) return null;
  const style: CSSProperties | undefined = color
    ? { ...props?.style, color }
    : props?.style;
  return createElement(Icon, { ...props, ...(style ? { style } : {}) });
}

// ─── Module grid 专用（复用旧 lucide-group-icon 能力） ──────────────────────

export { lookupLucideIcon };

export function resolveGroupFallbackIcon(groupKey: string): LucideIcon {
  if (groupKey === '__other__') return LayoutGrid;
  return Package;
}

/**
 * 渲染分组图标（module-grid header）：
 *   1. comp 命中位图 → `<img>`
 *   2. comp 命中 Lucide → SVG
 *   3. 兜底 groupKey → Package / LayoutGrid
 */
export function renderGroupIcon(
  groupKey: string,
  customIcon?: ModuleIconConfig | string,
  props?: SVGProps<SVGSVGElement>,
): ReactElement {
  const cfg = typeof customIcon === 'string' ? { comp: customIcon } : customIcon;
  if (cfg?.comp) {
    const url = resolveIconAssetUrl(cfg.comp);
    if (url) return renderBitmapIcon(url, typeof props?.className === 'string' ? props.className : undefined);
  }
  const Icon = cfg?.comp ? (lookupLucideIcon(cfg.comp) ?? resolveGroupFallbackIcon(groupKey)) : resolveGroupFallbackIcon(groupKey);
  const { style, ...rest } = props ?? {};
  return createElement(Icon, {
    ...rest,
    style: cfg?.color ? { ...style, color: cfg.color } : style,
  });
}

/**
 * 渲染卡片标题旁小图标（module-card）：
 *   1. comp 命中位图 → `<img>`
 *   2. comp 命中 Lucide → SVG
 *   3. 无法解析 → null
 */
export function renderModuleIcon(
  icon: ModuleIconConfig,
  className = 'size-4',
): ReactElement | null {
  const url = resolveIconAssetUrl(icon.comp);
  if (url) return renderBitmapIcon(url, `${className} object-contain`);
  const Icon = lookupLucideIcon(icon.comp);
  if (!Icon) return null;
  return createElement(Icon, {
    className,
    ...(icon.color ? { style: { color: icon.color } } : {}),
    'aria-hidden': true,
  });
}
