/** localStorage 键，与 `src/app/fd-color-presets.css` 中 `data-fd-color-preset` 取值一致 */
export const FD_COLOR_PRESET_STORAGE_KEY = 'fd-color-preset';

/** 与 Fumadocs 官方主题预设对应（见 https://fumadocs.nodejs.cn/docs/ui/theme ） */
export const FD_COLOR_PRESETS = [
  { id: 'blue', label: '默认' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'purple', label: 'Purple' },
  { id: 'vitepress', label: 'VitePress' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'black', label: 'Black' },
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'aspen', label: 'Aspen' },
] as const;

export type FdColorPresetId = (typeof FD_COLOR_PRESETS)[number]['id'];

export const FD_COLOR_PRESET_DEFAULT: FdColorPresetId = 'blue';

/** 写入 `document.documentElement` 与 localStorage，与 `fd-color-presets.css` 选择器一致 */
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
}
