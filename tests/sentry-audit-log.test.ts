import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSentryEnvironment,
  getSentryRelease,
  getSentryTracesSampleRate,
  isSentryEnabled,
  parseUserAgent,
  shouldEmitAuthDeny,
  formatDocsViewMessage,
  shouldEmitDocsView,
  shouldEmitMcpCall,
  shouldEmitMcpDeny,
  shouldEmitMcpRpc,
  shouldEmitSsoGate,
  isOpaqueTraceName,
  resolveReadableTraceName,
  stripPathQuery,
  applyReadableTraceName,
  buildTraceContextAttributes,
} from '../src/lib/observability/sentry';
import {
  extractGeoAsn,
  isRscRequest,
  resolveAuthMethod,
} from '../src/lib/observability/request-enrichment';

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

  it('getSentryRelease prefers SENTRY_RELEASE then GIT_SHA', () => {
    const prevRelease = process.env.SENTRY_RELEASE;
    const prevGit = process.env.GIT_SHA;
    try {
      delete process.env.SENTRY_RELEASE;
      delete process.env.GIT_SHA;
      assert.equal(getSentryRelease(), undefined);
      process.env.GIT_SHA = 'abc123';
      assert.equal(getSentryRelease(), 'abc123');
      process.env.SENTRY_RELEASE = 'v1.2.3';
      assert.equal(getSentryRelease(), 'v1.2.3');
    } finally {
      if (prevRelease === undefined) delete process.env.SENTRY_RELEASE;
      else process.env.SENTRY_RELEASE = prevRelease;
      if (prevGit === undefined) delete process.env.GIT_SHA;
      else process.env.GIT_SHA = prevGit;
    }
  });

  it('getSentryTracesSampleRate reads env with default 1', () => {
    const prev = process.env.SENTRY_TRACES_SAMPLE_RATE;
    try {
      delete process.env.SENTRY_TRACES_SAMPLE_RATE;
      assert.equal(getSentryTracesSampleRate(), 1);
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.2';
      assert.equal(getSentryTracesSampleRate(), 0.2);
      process.env.SENTRY_TRACES_SAMPLE_RATE = '2';
      assert.equal(getSentryTracesSampleRate(), 1);
    } finally {
      if (prev === undefined) delete process.env.SENTRY_TRACES_SAMPLE_RATE;
      else process.env.SENTRY_TRACES_SAMPLE_RATE = prev;
    }
  });
});

describe('request-enrichment', () => {
  it('resolveAuthMethod buckets', () => {
    assert.equal(resolveAuthMethod({ path: '/embed/docs/foo' }), 'embed');
    assert.equal(resolveAuthMethod({ outcome: 'embed_ok' }), 'embed');
    assert.equal(resolveAuthMethod({ authorization: 'DOCMCPTOKEN' }), 'mcp_token');
    assert.equal(resolveAuthMethod({ authorization: 'DOCSESSION' }), 'session');
    assert.equal(resolveAuthMethod({}), 'anonymous');
  });

  it('isRscRequest detects _rsc query', () => {
    assert.equal(isRscRequest('_rsc=abc'), true);
    assert.equal(isRscRequest('x=1&_rsc=abc'), true);
    assert.equal(isRscRequest('foo=1'), false);
    assert.equal(isRscRequest(undefined), false);
  });

  it('extractGeoAsn reads headers', () => {
    const headers = new Headers({
      'cf-ipcountry': 'cn',
      'cf-region': 'ZJ',
      'cf-ipasn': 'AS4134',
    });
    assert.deepEqual(extractGeoAsn(headers), {
      geoCountry: 'CN',
      geoRegion: 'ZJ',
      asn: '4134',
    });
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

describe('shouldEmitMcpCall / shouldEmitMcpDeny / shouldEmitMcpRpc', () => {
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

  it('rpc for initialize/list but not tools/call or empty_body', () => {
    assert.equal(shouldEmitMcpRpc({ rpcMethod: 'initialize', outcome: 'ok' }), true);
    assert.equal(shouldEmitMcpRpc({ rpcMethod: 'tools/list', outcome: 'ok' }), true);
    assert.equal(
      shouldEmitMcpRpc({ rpcMethod: 'tools/call', tool: 'searchDocumentationPages', outcome: 'ok' }),
      false,
    );
    assert.equal(shouldEmitMcpRpc({ rpcMethod: 'empty_body', outcome: 'invalid' }), false);
    assert.equal(shouldEmitMcpRpc({ rpcMethod: 'initialize', outcome: 'unauthorized' }), false);
  });
});

describe('buildTraceContextAttributes', () => {
  it('includes auth/rsc/geo/mcp/release', () => {
    const prev = process.env.SENTRY_RELEASE;
    try {
      process.env.SENTRY_RELEASE = 'deadbeef';
      const attrs = buildTraceContextAttributes({
        accessOrigin: 'cube',
        authMethod: 'session',
        rsc: true,
        geoCountry: 'CN',
        asn: '4134',
        mcpRpcMethod: 'tools/call',
        mcpParamTag: 'rpa',
        mcpParamScope: 'docs',
      });
      assert.equal(attrs['auth.method'], 'session');
      assert.equal(attrs['http.rsc'], true);
      assert.equal(attrs['geo.country'], 'CN');
      assert.equal(attrs['geo.asn'], '4134');
      assert.equal(attrs['mcp.rpc_method'], 'tools/call');
      assert.equal(attrs['mcp.param.tag'], 'rpa');
      assert.equal(attrs['mcp.param.scope'], 'docs');
      assert.equal(attrs['git.sha'], 'deadbeef');
      assert.equal(attrs.release, 'deadbeef');
    } finally {
      if (prev === undefined) delete process.env.SENTRY_RELEASE;
      else process.env.SENTRY_RELEASE = prev;
    }
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
