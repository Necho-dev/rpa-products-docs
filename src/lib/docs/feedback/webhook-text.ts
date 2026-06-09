/**
 * 钉钉 AI 表格自动化写入字段时会把 `{...}` 二次当作模板解析。
 * 对含花括号的文本用单引号包裹整段，使内部 `{}` 按字面量处理，避免变成空对象。
 * 字段内若本身含单引号，按 SQL 风格加倍为 `''`。
 */
export function sanitizeWebhookTextField(value: string): string {
  if (!value || !/[{}]/.test(value)) return value;
  return `'${value.replace(/'/g, "''")}'`;
}
