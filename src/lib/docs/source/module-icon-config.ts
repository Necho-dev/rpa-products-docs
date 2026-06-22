/** ModuleGrid 卡片图标：lucide 组件名 + 可选自定义颜色 */
export type ModuleIconConfig = {
  comp: string;
  color?: string;
};

/** 兼容 frontmatter 简写 `moduleIcon: Bot` 与对象 `{ comp, color? }` */
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
