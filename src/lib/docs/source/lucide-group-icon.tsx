'use client';

import * as LucideIcons from 'lucide-react';
import { LayoutGrid, Package, type LucideIcon } from 'lucide-react';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';
import { createElement, type SVGProps } from 'react';

const LUCIDE_ICON_MAP = LucideIcons as Record<string, unknown>;

const BLOCKLIST = new Set(['createLucideIcon', 'useLucideContext']);

function isLucideIconComponent(value: unknown): value is LucideIcon {
  if (value == null) return false;
  if (typeof value === 'function') return true;
  if (
    typeof value === 'object' &&
    'render' in value &&
    typeof (value as { render: unknown }).render === 'function'
  ) {
    return true;
  }
  return false;
}

/** PascalCase（ShoppingBag）或 kebab-case（shopping-bag）→ PascalCase */
function toPascalCaseIconName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed.includes('-')) return trimmed;
  return trimmed
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function lookupLucideIcon(iconName: string): LucideIcon | undefined {
  const pascal = toPascalCaseIconName(iconName);
  if (BLOCKLIST.has(pascal)) return undefined;
  const candidate = LUCIDE_ICON_MAP[pascal];
  return isLucideIconComponent(candidate) ? candidate : undefined;
}

export function resolveGroupIcon(
  groupKey: string,
  customIconName?: string,
): LucideIcon {
  if (customIconName) {
    const custom = lookupLucideIcon(customIconName);
    if (custom) return custom;
  }
  if (groupKey === '__other__') return LayoutGrid;
  return Package;
}

export function renderGroupIcon(
  groupKey: string,
  customIcon?: ModuleIconConfig | string,
  props?: SVGProps<SVGSVGElement>,
) {
  const iconConfig =
    typeof customIcon === 'string' ? { comp: customIcon } : customIcon;
  const Icon = resolveGroupIcon(groupKey, iconConfig?.comp);
  const { style, ...rest } = props ?? {};
  return createElement(Icon, {
    ...rest,
    style: iconConfig?.color
      ? { ...style, color: iconConfig.color }
      : style,
  });
}
