import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clientIp,
  normalizeClientIp,
  pathCategory,
  sanitizeQuery,
  shouldLogAccessRequest,
} from '../src/lib/observability/access-log';
import {
  accessLogFilePathForDate,
  appendAccessLogFile,
} from '../src/lib/observability/access-log-file';
import {
  formatAccessLogPretty,
  formatAccessLogStdout,
  formatAccessLogTime,
  formatHttpMethod,
  formatMcpMethodLabel,
  formatSubduedLogMeta,
  shouldUseStdoutColors,
} from '../src/lib/observability/access-log-stdout';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

describe('access-log', () => {
  it('pathCategory 识别 API 与文档', () => {
    assert.equal(pathCategory('/api/search'), 'api');
    assert.equal(pathCategory('/docs/connectors/foo'), 'docs');
    assert.equal(pathCategory('/mcp'), 'mcp');
    assert.equal(pathCategory('/og/docs/foo/quote.png'), 'og');
  });

  it('sanitizeQuery 脱敏签名参数', () => {
    const q = sanitizeQuery('text=hello&sg=abc123&tm=123');
    assert.match(q ?? '', /sg=\[redacted\]/);
    assert.match(q ?? '', /text=hello/);
  });

  it('shouldLogAccessRequest 跳过 health', () => {
    const prev = process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
    process.env.DOCS_OBSERVABILITY_LOG_ENABLED = 'true';
    try {
      const req = new NextRequest('http://127.0.0.1/health');
      assert.equal(shouldLogAccessRequest(req), false);
      const docs = new NextRequest('http://127.0.0.1/docs');
      assert.equal(shouldLogAccessRequest(docs), true);
    } finally {
      if (prev === undefined) delete process.env.DOCS_OBSERVABILITY_LOG_ENABLED;
      else process.env.DOCS_OBSERVABILITY_LOG_ENABLED = prev;
    }
  });

  it('normalizeClientIp 将 ::1 转为 127.0.0.1', () => {
    assert.equal(normalizeClientIp('::1'), '127.0.0.1');
    assert.equal(normalizeClientIp('::ffff:192.168.1.1'), '192.168.1.1');
    assert.equal(normalizeClientIp('10.0.0.5'), '10.0.0.5');
  });

  it('clientIp 读取 x-forwarded-for 并归一化', () => {
    const req = new NextRequest('http://127.0.0.1/docs', {
      headers: { 'x-forwarded-for': '::1, 10.0.0.1' },
    });
    assert.equal(clientIp(req), '127.0.0.1');
  });

  it('formatAccessLogTime 格式化 UTC 时间', () => {
    assert.equal(formatAccessLogTime('2026-06-30T14:00:00.000Z'), '2026-06-30 14:00:00.000');
  });

  it('formatHttpMethod 按方法着色', () => {
    assert.equal(formatHttpMethod('get', false), 'GET');
    assert.match(formatHttpMethod('GET', true), /\x1b\[36m\x1b\[1mGET\x1b\[0m/);
    assert.match(formatHttpMethod('POST', true), /\x1b\[33m\x1b\[1mPOST\x1b\[0m/);
  });

  it('formatSubduedLogMeta 弱化 IP/UA', () => {
    assert.equal(formatSubduedLogMeta('127.0.0.1', false), '127.0.0.1');
    assert.match(formatSubduedLogMeta('127.0.0.1', true), /\x1b\[2m\x1b\[90m127\.0\.0\.1\x1b\[0m/);
  });

  it('formatMcpMethodLabel 高亮 tool 名称', () => {
    assert.equal(formatMcpMethodLabel('tools/call', 'search_docs', false), 'tools/call search_docs');
    const colored = formatMcpMethodLabel('tools/call', 'search_docs', true);
    assert.match(colored, /tools\/call/);
    assert.match(colored, /\x1b\[33m\x1b\[1msearch_docs\x1b\[0m/);
  });

  it('formatAccessLogPretty 含时间与 UA', () => {
    const line = formatAccessLogPretty(
      {
        timestamp: 1719758400000,
        time: '2026-06-30T14:00:00.000Z',
        type: 'access',
        method: 'GET',
        path: '/docs/foo',
        status: 200,
        outcome: 'forward',
        category: 'docs',
        durationMs: 1,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 TestBrowser',
      },
      { useColors: false },
    );
    assert.match(
      line,
      /^2026-06-30 14:00:00\.000 \[ACCESS\] GET \/docs\/foo 200 in 1ms \(forward · docs\) \(127\.0\.0\.1 · Mozilla\/5\.0 TestBrowser\)$/,
    );
  });

  it('formatAccessLogStdout 生产环境亦为 pretty', () => {
    const line = formatAccessLogStdout(
      {
        timestamp: 1,
        time: '2026-06-30T00:00:00.000Z',
        type: 'access',
        method: 'GET',
        path: '/api/search',
        status: 200,
        outcome: 'forward',
        category: 'api',
        durationMs: 2,
      },
      { useColors: false },
    );
    assert.match(line, /^2026-06-30 00:00:00\.000 \[ACCESS\] GET \/api\/search 200 in 2ms/);
  });

  it('shouldUseStdoutColors 尊重 NO_COLOR', () => {
    assert.equal(
      shouldUseStdoutColors({ env: { NO_COLOR: '1' }, isTTY: true }),
      false,
    );
  });

  it('accessLogFilePathForDate 按 UTC 日期分文件', () => {
    const filePath = accessLogFilePathForDate(
      new Date('2026-06-30T12:00:00.000Z'),
      '/var/log/docs/access',
    );
    assert.equal(filePath, '/var/log/docs/access/log-20260630.jsonl');
  });

  it('appendAccessLogFile 写入 JSONL 行', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'docs-access-log-'));
    const filePath = accessLogFilePathForDate(new Date('2026-06-30T12:00:00.000Z'), dir)!;
    process.env.DOCS_OBSERVABILITY_LOG_PATH = dir;
    try {
      appendAccessLogFile({ timestamp: 1719758521000, time: '2026-06-30T12:00:01.000Z', type: 'access', path: '/api/search' });
      await new Promise((r) => setTimeout(r, 50));
      const content = await readFile(filePath, 'utf8');
      assert.match(content, /"path":"\/api\/search"/);
    } finally {
      delete process.env.DOCS_OBSERVABILITY_LOG_PATH;
    }
  });
});
