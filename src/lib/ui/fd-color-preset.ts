/** localStorage / Cookie 键，与 `src/app/fd-color-presets.css` 中 `data-fd-color-preset` 取值一致 */
export const FD_COLOR_PRESET_STORAGE_KEY = 'fd-color-preset';

/** 与 Fumadocs 官方主题预设对应（见 https://fumadocs.nodejs.cn/docs/ui/theme ） */
export const FD_COLOR_PRESETS = [
  { id: 'blue', label: '默认' },
  { id: 'neutral', label: 'NEUTRAL' },
  { id: 'ocean', label: 'OCEAN' },
  { id: 'purple', label: 'PURPLE' },
  { id: 'vitepress', label: 'VITEPRESS' },
  { id: 'dusk', label: 'DUSK' },
  { id: 'emerald', label: 'EMERALD' },
  { id: 'ruby', label: 'RUBY' },
  { id: 'black', label: 'BLACK' },
  { id: 'catppuccin', label: 'CATPPUCCIN' },
  { id: 'aspen', label: 'ASPEN' },
] as const;

export type FdColorPresetId = (typeof FD_COLOR_PRESETS)[number]['id'];

export const FD_COLOR_PRESET_DEFAULT: FdColorPresetId = 'blue';

/** 各预设浅色态主色（用于 paint-bucket 等色标，与 fd-color-presets.css 对齐） */
export const FD_COLOR_PRESET_SWATCH: Record<FdColorPresetId, string> = {
  blue: 'hsl(221, 83%, 53%)',
  neutral: 'hsl(240, 5%, 46%)',
  ocean: 'hsl(210, 80%, 32%)',
  purple: 'hsl(270, 100%, 52%)',
  vitepress: 'hsl(226, 55%, 45%)',
  dusk: 'hsl(340, 40%, 48%)',
  emerald: 'hsl(168, 70%, 40%)',
  ruby: 'hsl(348, 85%, 45%)',
  black: 'hsl(0, 0%, 18%)',
  catppuccin: 'hsl(266, 85%, 58%)',
  aspen: 'hsl(80, 60%, 40%)',
};

export function isFdColorPresetId(value: string | null | undefined): value is FdColorPresetId {
  return !!value && FD_COLOR_PRESETS.some((p) => p.id === value);
}

export function parseFdColorPresetId(value: string | null | undefined): FdColorPresetId {
  return isFdColorPresetId(value) ? value : FD_COLOR_PRESET_DEFAULT;
}

/** 服务端渲染用：neutral 不写属性，其余写 data-fd-color-preset */
export function fdColorPresetHtmlAttribute(
  id: FdColorPresetId,
): FdColorPresetId | undefined {
  return id === 'neutral' ? undefined : id;
}

/** 写入 `document.documentElement`、localStorage 与 Cookie（供 SSR 首屏读） */
export function applyFdColorPresetToDocument(id: FdColorPresetId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (id === 'neutral') {
    root.removeAttribute('data-fd-color-preset');
  } else {
    root.setAttribute('data-fd-color-preset', id);
  }
  try {
    localStorage.setItem(FD_COLOR_PRESET_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${FD_COLOR_PRESET_STORAGE_KEY}=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
