import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isBrowserSentryEnabled,
  readDocsPublicSentryConfig,
  serializeDocsPublicConfigScript,
} from '../src/lib/observability/sentry/public-config';

describe('sentry-public-config', () => {
  it('serializes into a globalThis assignment and escapes script breakers', () => {
    const script = serializeDocsPublicConfigScript({
      sentry: {
        dsn: 'https://key@sentry.example/1</script>',
        environment: 'dev',
        tracesSampleRate: 1,
        profilesSampleRate: 0,
        profileSessionSampleRate: 0,
        enableLogs: true,
        sendDefaultPii: true,
      },
    });
    assert.match(script, /^globalThis\.__KNOWLEDGE_PUBLIC_CONFIG__=/);
    assert.doesNotMatch(script, /<\/script>/i);
  });

  it('reads injected config without process.env', () => {
    const prev = globalThis.__KNOWLEDGE_PUBLIC_CONFIG__;
    try {
      globalThis.__KNOWLEDGE_PUBLIC_CONFIG__ = {
        sentry: {
          dsn: 'https://key@sentry.example/1',
          environment: 'production',
          tracesSampleRate: 0.2,
          profilesSampleRate: 0,
          profileSessionSampleRate: 0,
          enableLogs: true,
          sendDefaultPii: false,
        },
      };
      assert.equal(isBrowserSentryEnabled(), true);
      assert.equal(readDocsPublicSentryConfig()?.environment, 'production');
      globalThis.__KNOWLEDGE_PUBLIC_CONFIG__ = { sentry: { environment: 'dev', tracesSampleRate: 1, profilesSampleRate: 0, profileSessionSampleRate: 0, enableLogs: true, sendDefaultPii: true } };
      assert.equal(isBrowserSentryEnabled(), false);
    } finally {
      globalThis.__KNOWLEDGE_PUBLIC_CONFIG__ = prev;
    }
  });
});
