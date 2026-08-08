import * as Sentry from '@sentry/nextjs';
import { getSentryDsn, getSentryEnvironment, isSentryEnabled } from '@/lib/observability/sentry/env';
import { registerReadableTraceNameHooks } from '@/lib/observability/sentry/trace-name';

const isDev = process.env.NODE_ENV === 'development';

if (isSentryEnabled()) {
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    enabled: true,

    tracesSampleRate: isDev ? 1.0 : 0.2,

    includeLocalVariables: true,

    enableLogs: true,

    // 内部知识库：Trace 上保留 user.ip_address 等
    sendDefaultPii: true,

    integrations: [
      Sentry.vercelAIIntegration({ force: true }),
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

  // 必须在 init 之后注册，才能覆盖 enhanceHandleRequestRootSpan 的路由模板名
  registerReadableTraceNameHooks();
}
