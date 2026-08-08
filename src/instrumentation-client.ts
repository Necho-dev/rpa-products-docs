import * as Sentry from '@sentry/nextjs';
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
} from '@/lib/observability/sentry/env';

const isDev = process.env.NODE_ENV === 'development';

if (isSentryEnabled()) {
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    enabled: true,

    tracesSampleRate: isDev ? 1.0 : 0.2,

    // 内部知识库流量有限：会话全量采样，便于 Replay 面板有数据
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,

    enableLogs: true,

    // 允许 Sentry 从上报连接推断 client IP（Replay / Error 列表侧边栏）
    sendDefaultPii: true,

    integrations: [
      // 公共知识库：文档正文可读，不做 mask/block（仍可对敏感 input 使用 data-sentry-mask）
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
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
