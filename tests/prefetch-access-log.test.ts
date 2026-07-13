import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import {
  isNextPrefetchRequest,
  prefetchTriggerPath,
  recordPrefetchAccess,
  resetPrefetchAccessBatchesForTests,
} from '../src/lib/observability/prefetch-access-log';

describe('prefetch-access-log', () => {
  it('isNextPrefetchRequest 识别 Next.js prefetch 头', () => {
    const prefetch = new NextRequest('http://127.0.0.1/docs/foo', {
      headers: { 'next-router-prefetch': '1' },
    });
    const normal = new NextRequest('http://127.0.0.1/docs/foo');
    assert.equal(isNextPrefetchRequest(prefetch), true);
    assert.equal(isNextPrefetchRequest(normal), false);
  });

  it('prefetchTriggerPath 优先 next-url', () => {
    const req = new NextRequest('http://127.0.0.1/docs/target', {
      headers: { 'next-url': '/docs/RPA_QIANNIU/foo' },
    });
    assert.equal(prefetchTriggerPath(req), '/docs/RPA_QIANNIU/foo');
  });

  it('recordPrefetchAccess 批次结束后写一条汇总', async () => {
    const prev = process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
    process.env.DOCS_OBSERVABILITY_LOG_ENABLED = 'true';
    resetPrefetchAccessBatchesForTests();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(String(args[0]));
    };
    try {
      const headers = {
        'next-router-prefetch': '1',
        'next-url': '/docs/page-a',
      };
      for (let i = 0; i < 3; i++) {
        const req = new NextRequest(`http://127.0.0.1/docs/page-${i}`, { headers });
        recordPrefetchAccess(req, new NextResponse(null, { status: 200 }), Date.now());
      }
      await new Promise((r) => setTimeout(r, 500));
      assert.equal(logs.length, 1);
      assert.match(logs[0] ?? '', /prefetch/);
      assert.match(logs[0] ?? '', /3 urls/);
      assert.match(logs[0] ?? '', /\/docs\/page-a/);
    } finally {
      console.log = orig;
      resetPrefetchAccessBatchesForTests();
      if (prev === undefined) delete process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
      else process.env.DOCS_OBSERVABILITY_LOG_ENABLED = prev;
    }
  });
});
