export function isDocFeedbackEnabled(): boolean {
  return Boolean(process.env.DOCS_FEEDBACK_WEBHOOK_URL?.trim());
}

export function docFeedbackWebhookUrl(): string | null {
  const url = process.env.DOCS_FEEDBACK_WEBHOOK_URL?.trim();
  return url || null;
}
