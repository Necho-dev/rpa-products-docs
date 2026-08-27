/**
 * 筛选芯片 / 卡片图标。
 * `comp`：platform icon CODE（如 `ICO_TAOBAO`）或 Lucide 名（如 `ShoppingBag`）；
 * `color` 仅对 Lucide 生效。
 */
export type ModuleIconConfig = {
  comp: string;
  color?: string;
};

/** 兼容简写 `Bot` 与对象 `{ comp, color? }` */
export function normalizeModuleIcon(value: unknown): ModuleIconConfig | undefined {
  if (typeof value === 'string') {
    const comp = value.trim();
    return comp ? { comp } : undefined;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const comp = typeof obj.comp === 'string' ? obj.comp.trim() : '';
    if (!comp) return undefined;
    const color =
      typeof obj.color === 'string' && obj.color.trim() ? obj.color.trim() : undefined;
    return color ? { comp, color } : { comp };
  }

  return undefined;
}
