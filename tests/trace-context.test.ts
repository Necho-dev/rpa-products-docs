import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTraceContextAttributes } from '../src/lib/observability/sentry/trace-context';

describe('buildTraceContextAttributes', () => {
  it('emits cube.origin and client.ip for traces group-by', () => {
    const attrs = buildTraceContextAttributes({
      accessOrigin: 'https://sample-cube.yuce-tech.cn',
      accessUser: 'u-1',
      ip: '192.168.1.10',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      status: 200,
      category: 'docs',
      outcome: 'forward',
    });
    assert.equal(attrs['cube.origin'], 'https://sample-cube.yuce-tech.cn');
    assert.equal(attrs['client.ip'], '192.168.1.10');
    assert.equal(attrs['client.address'], '192.168.1.10');
    assert.equal(attrs['user.id'], 'u-1');
    assert.equal(attrs['browser.name'], 'Chrome');
    assert.equal(attrs['os.name'], 'macOS');
    assert.equal(attrs['http.status_code'], 200);
    assert.equal(attrs['knowledge.category'], 'docs');
    assert.equal(attrs['knowledge.outcome'], 'forward');
  });

  it('omits empty values', () => {
    const attrs = buildTraceContextAttributes({ accessOrigin: undefined, ip: '' });
    assert.equal(attrs['cube.origin'], undefined);
    assert.equal(attrs['client.ip'], undefined);
  });
});
