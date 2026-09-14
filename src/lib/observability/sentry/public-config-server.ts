import {
  getSentryDsn,
  getSentryEnableLogs,
  getSentryEnvironment,
  getSentryProfileSessionSampleRate,
  getSentryProfilesSampleRate,
  getSentryRelease,
  getSentrySendDefaultPii,
  getSentryTracesSampleRate,
} from '@/lib/observability/sentry/env';
import type { DocsPublicConfig } from '@/lib/observability/sentry/public-config';

/** 服务端组装浏览器公开配置。勿从 `'use client'` 引用。 */
export function getDocsPublicConfig(): DocsPublicConfig {
  return {
    sentry: {
      dsn: getSentryDsn(),
      environment: getSentryEnvironment(),
      release: getSentryRelease(),
      tracesSampleRate: getSentryTracesSampleRate(),
      profilesSampleRate: getSentryProfilesSampleRate(),
      profileSessionSampleRate: getSentryProfileSessionSampleRate(),
      enableLogs: getSentryEnableLogs(),
      sendDefaultPii: getSentrySendDefaultPii(),
    },
  };
}
