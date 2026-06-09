export type DocFeedbackSource = 'selection' | 'document';

export type DocFeedbackSubmitBody = {
  errorContent: string;
  docUrl: string;
  reason: string;
  description?: string;
  source: DocFeedbackSource;
  pagePath?: string;
};

export type DocFeedbackOpenPayload = {
  errorContent: string;
  docUrl: string;
  source: DocFeedbackSource;
  pagePath?: string;
};
