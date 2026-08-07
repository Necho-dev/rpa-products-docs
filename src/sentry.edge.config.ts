import * as Sentry from '@sentry/nextjs';
import { getSentryDsn, getSentryEnvironment, isSentryEnabled } from '@/lib/observability/sentry';

const isDev = process.env.NODE_ENV === 'development';

if (isSentryEnabled()) {
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    enabled: true,

    tracesSampleRate: isDev ? 1.0 : 0.2,

    enableLogs: true,

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
}
