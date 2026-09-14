import type { Integration } from '@sentry/core';
import * as Sentry from '@sentry/nextjs';
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  getSentrySharedInitOptions,
  isSentryEnabled,
  isSentryProfilingEnabled,
} from '@/lib/observability/sentry/env';
import { registerReadableTraceNameHooks } from '@/lib/observability/sentry/trace-name';

const isDev = process.env.NODE_ENV === 'development';

function nodeProfilingIntegrations(): Integration[] {
  if (!isSentryProfilingEnabled()) return [];
  try {
    // Node runtime；原生二进制缺失时不阻断 Errors / Trace
    const { nodeProfilingIntegration } = require('@sentry/profiling-node') as {
      nodeProfilingIntegration: () => Integration;
    };
    return [nodeProfilingIntegration()];
  } catch (err) {
    console.warn('[sentry] @sentry/profiling-node 未加载，跳过 Node Profile', err);
    return [];
  }
}

if (isSentryEnabled()) {
  const shared = getSentrySharedInitOptions();
  Sentry.init({
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    enabled: true,
    ...shared,
    includeLocalVariables: true,
    integrations: [
      Sentry.vercelAIIntegration({ force: true }),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
      ...nodeProfilingIntegrations(),
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
