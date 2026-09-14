export type DocsPublicSentryConfig = {
  dsn?: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  profileSessionSampleRate: number;
  enableLogs: boolean;
  sendDefaultPii: boolean;
};

export type DocsPublicConfig = {
  sentry: DocsPublicSentryConfig;
};

declare global {
  // eslint-disable-next-line no-var
  var __KNOWLEDGE_PUBLIC_CONFIG__: DocsPublicConfig | undefined;
}

export function serializeDocsPublicConfigScript(config: DocsPublicConfig): string {
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  return `globalThis.__KNOWLEDGE_PUBLIC_CONFIG__=${json}`;
}

/** 浏览器：只读 layout 注入的对象，不读 process.env */
export function readDocsPublicSentryConfig(): DocsPublicSentryConfig | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.__KNOWLEDGE_PUBLIC_CONFIG__?.sentry;
}

export function isBrowserSentryEnabled(): boolean {
  const dsn = readDocsPublicSentryConfig()?.dsn?.trim();
  return Boolean(dsn);
}
