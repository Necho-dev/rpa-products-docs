/**
 * 平台位图图标 CODE：与平台 CODE 同源，仅将 `RPA_` 换成 `ICO_`。
 * 文档解析只认精确的 `ICO_*`；裸 CODE（`QIANNIU`、`ALI1688`）与 `RPA_*` 都不命中。
 */
export const PLATFORM_ICON_CODE_RE = /^ICO_[A-Z0-9][A-Z0-9_]*$/;
const PLATFORM_ENTRY_CODE_RE = /^RPA_[A-Z0-9][A-Z0-9_]*$/;

/**
 * platform icons.json 的 lookup key。
 * 仅 `ICO_*` 原样命中；`RPA_*`、裸 CODE、Lucide 名一律 undefined。
 */
export function platformIconLookupKey(
  name: string | undefined | null,
): string | undefined {
  const t = name?.trim();
  if (!t) return undefined;
  return PLATFORM_ICON_CODE_RE.test(t) ? t : undefined;
}

/**
 * CLI / 写入侧：接受 `ICO_*` 或 `RPA_*`（派生为 ICO_），拒绝裸 CODE。
 * 大小写不敏感。不用于文档解析。
 */
export function parsePlatformIconCode(raw: string): string | undefined {
  const t = raw.trim().toUpperCase();
  if (!t) return undefined;
  if (PLATFORM_ICON_CODE_RE.test(t)) return t;
  if (PLATFORM_ENTRY_CODE_RE.test(t)) return `ICO_${t.slice(4)}`;
  return undefined;
}

export function platformIconCodeError(raw: string): string {
  return (
    `无效 CODE「${raw}」。须为 ICO_*，或由 RPA_* 派生（如 RPA_QIANNIU → ICO_QIANNIU），` +
    '不接受裸 CODE。'
  );
}
