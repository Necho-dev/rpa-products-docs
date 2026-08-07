import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSentryEnvironment,
  isSentryEnabled,
  parseUserAgent,
  shouldEmitAuthDeny,
  formatDocsViewMessage,
  shouldEmitDocsView,
  shouldEmitMcpCall,
  shouldEmitMcpDeny,
  shouldEmitSsoGate,
  isOpaqueTraceName,
  resolveReadableTraceName,
  stripPathQuery,
  applyReadableTraceName,
} from '../src/lib/observability/sentry';

describe('sentry-env', () => {
  it('isSentryEnabled follows SENTRY_DSN', () => {
    const prev = process.env.SENTRY_DSN;
    try {
      delete process.env.SENTRY_DSN;
      assert.equal(isSentryEnabled(), false);
      process.env.SENTRY_DSN = '   ';
      assert.equal(isSentryEnabled(), false);
      process.env.SENTRY_DSN = 'https://example@sentry.example/1';
      assert.equal(isSentryEnabled(), true);
    } finally {
      if (prev === undefined) delete process.env.SENTRY_DSN;
      else process.env.SENTRY_DSN = prev;
    }
  });

  it('SENTRY_ENVIRONMENT defaults to dev', () => {
    const prev = process.env.SENTRY_ENVIRONMENT;
    try {
      delete process.env.SENTRY_ENVIRONMENT;
      assert.equal(getSentryEnvironment(), 'dev');
      process.env.SENTRY_ENVIRONMENT = 'production';
      assert.equal(getSentryEnvironment(), 'production');
    } finally {
      if (prev === undefined) delete process.env.SENTRY_ENVIRONMENT;
      else process.env.SENTRY_ENVIRONMENT = prev;
    }
  });
});

describe('shouldEmitDocsView', () => {
  it('emits real docs navigation', () => {
    assert.equal(shouldEmitDocsView({ path: '/docs/rpa/foo', outcome: 'forward' }), true);
    assert.equal(shouldEmitDocsView({ path: '/embed/docs/rpa/foo', outcome: 'embed_ok' }), true);
  });

  it('skips prefetch and non-docs', () => {
    assert.equal(shouldEmitDocsView({ path: '/docs/rpa/foo', outcome: 'prefetch' }), false);
    assert.equal(shouldEmitDocsView({ path: '/api/search', outcome: 'forward' }), false);
    assert.equal(shouldEmitDocsView({ path: '/', outcome: 'forward' }), false);
    assert.equal(shouldEmitDocsView({ path: '/docs/rpa/foo', outcome: 'ua_denied' }), false);
  });

  it('formatDocsViewMessage is list-readable', () => {
    assert.equal(
      formatDocsViewMessage({
        method: 'GET',
        path: '/docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-sellmanage-list',
        status: 200,
      }),
      '[docs.view] GET /docs/rpa/RPA_QIANNIU/rpa-conn-qianniu-item-sellmanage-list 200',
    );
  });
});

describe('shouldEmitMcpCall / shouldEmitMcpDeny', () => {
  it('call only when authenticated tools/call', () => {
    assert.equal(
      shouldEmitMcpCall({ rpcMethod: 'tools/call', tool: 'searchDocumentationPages', outcome: 'ok' }),
      true,
    );
    assert.equal(
      shouldEmitMcpCall({
        rpcMethod: 'tools/call',
        tool: 'searchDocumentationPages',
        outcome: 'unauthorized',
      }),
      false,
    );
    assert.equal(shouldEmitMcpCall({ rpcMethod: 'initialize', outcome: 'ok' }), false);
  });

  it('deny on unauthorized', () => {
    assert.equal(shouldEmitMcpDeny({ outcome: 'unauthorized' }), true);
    assert.equal(shouldEmitMcpDeny({ outcome: 'ok' }), false);
  });
});

describe('shouldEmitSsoGate / shouldEmitAuthDeny', () => {
  it('sso only redirect and unauthorized', () => {
    assert.equal(shouldEmitSsoGate({ outcome: 'redirect' }), true);
    assert.equal(shouldEmitSsoGate({ outcome: 'unauthorized' }), true);
    assert.equal(shouldEmitSsoGate({ outcome: 'pass' }), false);
  });

  it('auth.deny for proxy gate outcomes', () => {
    assert.equal(shouldEmitAuthDeny({ outcome: 'ua_denied' }), true);
    assert.equal(shouldEmitAuthDeny({ outcome: 'embed_denied' }), true);
    assert.equal(shouldEmitAuthDeny({ outcome: 'embed_block' }), true);
    assert.equal(shouldEmitAuthDeny({ outcome: 'og_denied' }), true);
    assert.equal(shouldEmitAuthDeny({ outcome: 'forward' }), false);
  });
});

describe('parseUserAgent', () => {
  it('parses chrome on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';
    assert.deepEqual(parseUserAgent(ua), { browser: 'Chrome', os: 'macOS' });
  });

  it('marks bots', () => {
    assert.equal(parseUserAgent('OAI-SearchBot/1.0')?.browser, 'bot');
  });
});

describe('readable trace name', () => {
  it('strips query and fragment', () => {
    assert.equal(stripPathQuery('/docs/foo?_rsc=1#x'), '/docs/foo');
    assert.equal(stripPathQuery(''), '/');
  });

  it('detects opaque SDK names', () => {
    assert.equal(isOpaqueTraceName('middleware GET'), true);
    assert.equal(isOpaqueTraceName('GET /docs/[[...slug]]'), true);
    assert.equal(isOpaqueTraceName('GET /api/chat'), false);
  });

  it('rewrites middleware GET via http.target', () => {
    assert.equal(
      resolveReadableTraceName(
        {
          'http.request.method': 'GET',
          'http.target': '/docs/rpa/foo?_rsc=abc',
        },
        'middleware GET',
      ),
      'GET /docs/rpa/foo',
    );
  });

  it('rewrites route template via http.target', () => {
    assert.equal(
      resolveReadableTraceName(
        {
          'http.request.method': 'GET',
          'http.target': '/docs/rpa/RPA_SYCM/item',
          'http.route': '/docs/[[...slug]]',
        },
        'GET /docs/[[...slug]]',
      ),
      'GET /docs/rpa/RPA_SYCM/item',
    );
  });

  it('prefers knowledge.trace_name', () => {
    assert.equal(
      resolveReadableTraceName(
        {
          'knowledge.trace_name': 'POST /mcp',
          'http.target': '/other',
        },
        'middleware POST',
      ),
      'POST /mcp',
    );
  });

  it('applyReadableTraceName mutates name and source', () => {
    const attributes: Record<string, unknown> = {
      'http.request.method': 'GET',
      'http.target': '/docs/rpa/bar',
      'sentry.segment.name': 'middleware GET',
    };
    let name = 'middleware GET';
    const ok = applyReadableTraceName({
      attributes,
      getName: () => name,
      setName: (n) => {
        name = n;
      },
    });
    assert.equal(ok, true);
    assert.equal(name, 'GET /docs/rpa/bar');
    assert.equal(attributes['sentry.source'], 'custom');
    assert.equal(attributes['sentry.segment.name'], 'GET /docs/rpa/bar');
  });
});
