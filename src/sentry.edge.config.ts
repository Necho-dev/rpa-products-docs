import * as Sentry from '@sentry/nextjs';
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  getSentrySharedInitOptions,
  isSentryEnabled,
} from '@/lib/observability/sentry/env';
import { registerReadableTraceNameHooks } from '@/lib/observability/sentry/trace-name';

const isDev = process.env.NODE_ENV === 'development';

if (isSentryEnabled()) {
  const shared = getSentrySharedInitOptions();
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    enabled: true,
    ...shared,
    integrations: [
      Sentry.vercelAIIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
    beforeSendLog: (log) => {
      if (!isDev && (log.level === 'debug' || log.level === 'trace')) {
        return null;
      }
      if (log.message?.includes('/health')) {
        return null;
      }
      return log;
    },
  });

  // 必须在 init 之后注册，才能覆盖 SDK enhanceMiddlewareRootSpan 的 middleware GET 折叠
  registerReadableTraceNameHooks();
}
