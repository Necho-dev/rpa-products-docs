const ZWSP = '\u200b';

/** 摘录多为 API 字段名；在 `/`、`_` 后插入零宽空格，便于窄容器内断行 */
export function formatExcerptQuoteForDisplay(text: string): string {
  return text.replace(/\//g, `/${ZWSP}`).replace(/_/g, `_${ZWSP}`);
}
