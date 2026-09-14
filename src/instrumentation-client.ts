import * as Sentry from '@sentry/nextjs';
import { readDocsPublicSentryConfig } from '@/lib/observability/sentry/public-config';

const isDev = process.env.NODE_ENV === 'development';
const cfg = readDocsPublicSentryConfig();

if (cfg?.dsn) {
  Sentry.init({
    dsn: cfg.dsn,
    environment: cfg.environment,
    release: cfg.release,
    enabled: true,
    tracesSampleRate: cfg.tracesSampleRate,
    profilesSampleRate: cfg.profilesSampleRate,
    profileSessionSampleRate: cfg.profileSessionSampleRate,
    profileLifecycle: 'trace',
    enableLogs: cfg.enableLogs,
    sendDefaultPii: cfg.sendDefaultPii,

    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
      ...(cfg.profilesSampleRate > 0 || cfg.profileSessionSampleRate > 0
        ? [Sentry.browserProfilingIntegration()]
        : []),
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
