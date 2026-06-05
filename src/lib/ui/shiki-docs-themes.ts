/**
 * Shiki 双主题（light / dark）预设。
 *
 * 切换方式：修改 `activeShikiThemePreset` 后重启 dev server（或执行 `npx fumadocs-mdx`）。
 *
 * | 预设 key     | 风格说明                          |
 * |-------------|-----------------------------------|
 * | github      | 原默认，偏克制                    |
 * | vitesse     | 对比更强，接近 Fumadocs 演示站感  |
 * | oneDark     | 暗色 One Dark Pro，亮色仍用 GitHub |
 * | material    | Material Theme 亮/暗              |
 * | poimandres  | 暗色 Poimandres，亮色仍用 GitHub  |
 */
export const shikiThemePresets = {
  github: { light: 'github-light', dark: 'github-dark-dimmed' },
  vitesse: { light: 'vitesse-light', dark: 'vitesse-dark' },
  oneDark: { light: 'github-light', dark: 'one-dark-pro' },
  material: { light: 'material-theme-lighter', dark: 'material-theme-darker' },
  poimandres: { light: 'github-light', dark: 'poimandres' },
} as const;

export type ShikiThemePreset = keyof typeof shikiThemePresets;

/** 改这里预览不同配色 */
export const activeShikiThemePreset: ShikiThemePreset = 'vitesse';

export const shikiDocsThemes = shikiThemePresets[activeShikiThemePreset];
