export const DOC_FEEDBACK_REASONS = [
  '参数说明错误',
  '实际返回与文档不一致',
  '文档没有及时更新',
  '样例缺失或错误',
  '文档描述不清',
  '链接地址错误',
  '配图错误',
  '其他错误',
] as const;

export type DocFeedbackReason = (typeof DOC_FEEDBACK_REASONS)[number];

export function isDocFeedbackReason(value: string): value is DocFeedbackReason {
  return (DOC_FEEDBACK_REASONS as readonly string[]).includes(value);
}
