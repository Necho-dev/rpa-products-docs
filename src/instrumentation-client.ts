import * as Sentry from '@sentry/nextjs';
import { getSentryDsn, getSentryEnvironment, isSentryEnabled } from '@/lib/observability/sentry/env';

const isDev = process.env.NODE_ENV === 'development';

if (isSentryEnabled()) {
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    enabled: true,

    tracesSampleRate: isDev ? 1.0 : 0.2,

    replaysSessionSampleRate: isDev ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    enableLogs: true,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],

    beforeSendLog: (log) => {
      if (!isDev && (log.level === 'debug' || log.level === 'trace')) {
        return null;
      }
      return log;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
