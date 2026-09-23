import type { DocFeedbackSource } from '@/lib/docs/feedback/types';

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

/** 页面底部评价, 不属于错误原因单选 */
export const DOC_PAGE_FEEDBACK_OPINIONS = ['有帮助', '没帮助'] as const;

export type DocFeedbackReason = (typeof DOC_FEEDBACK_REASONS)[number];

export type DocPageFeedbackOpinion = (typeof DOC_PAGE_FEEDBACK_OPINIONS)[number];

export function isDocFeedbackReason(value: string): value is DocFeedbackReason {
  return (DOC_FEEDBACK_REASONS as readonly string[]).includes(value);
}

export function isDocPageFeedbackOpinion(value: string): value is DocPageFeedbackOpinion {
  return (DOC_PAGE_FEEDBACK_OPINIONS as readonly string[]).includes(value);
}

export function isAllowedDocFeedbackReason(source: DocFeedbackSource, reason: string): boolean {
  if (source === 'page') return isDocPageFeedbackOpinion(reason);
  return isDocFeedbackReason(reason);
}
