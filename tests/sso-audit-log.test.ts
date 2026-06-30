import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildSsoLogEntry,
  formatSsoLogPretty,
  ssoOutcomeFromStatus,
} from '../src/lib/observability/sso-audit-log';

describe('sso-audit-log', () => {
  it('ssoOutcomeFromStatus 映射门禁结果', () => {
    assert.equal(ssoOutcomeFromStatus(401), 'unauthorized');
    assert.equal(ssoOutcomeFromStatus(302), 'redirect');
    assert.equal(ssoOutcomeFromStatus(307), 'redirect');
    assert.equal(ssoOutcomeFromStatus(200), 'pass');
  });

  it('buildSsoLogEntry 记录 redirect 目标', () => {
    const request = new NextRequest('http://127.0.0.1/docs/foo?bar=1');
    const response = NextResponse.redirect(
      new URL('/auth/login?redirect=%2Fdocs%2Ffoo%3Fbar%3D1', request.url),
    );
    const entry = buildSsoLogEntry(request, response, 'redirect', Date.now() - 5);
    assert.equal(entry.type, 'sso');
    assert.equal(entry.outcome, 'redirect');
    assert.match(entry.redirectTo ?? '', /^\/auth\/login\?redirect=/);
  });

  it('formatSsoLogPretty 含 SSO 标签与 outcome', () => {
    const line = formatSsoLogPretty(
      {
        timestamp: 1,
        time: '2026-06-30T15:00:00.000Z',
        type: 'sso',
        method: 'GET',
        path: '/docs/foo',
        status: 302,
        outcome: 'redirect',
        category: 'docs',
        durationMs: 2,
        redirectTo: '/auth/login?redirect=%2Fdocs%2Ffoo',
        ip: '127.0.0.1',
      },
      { useColors: false },
    );
    assert.match(
      line,
      /^2026-06-30 15:00:00\.000 \[SSO\] GET \/docs\/foo 302 in 2ms \(redirect · docs · → \/auth\/login\?redirect=%2Fdocs%2Ffoo\) \(127\.0\.0\.1\)$/,
    );
  });

  it('formatSsoLogPretty 身份字段独立括号组（pass 仅兼容历史 jsonl）', () => {
    const line = formatSsoLogPretty(
      {
        timestamp: 1,
        time: '2026-06-30T15:00:00.000Z',
        type: 'sso',
        method: 'GET',
        path: '/docs',
        status: 200,
        outcome: 'pass',
        category: 'docs',
        durationMs: 1,
        accessUser: 'dev-user',
        accessOrigin: 'http://127.0.0.1:8765',
        ip: '127.0.0.1',
      },
      { useColors: false },
    );
    assert.match(
      line,
      /\[SSO\] GET \/docs 200 in 1ms \(pass · docs\) \(user:dev-user · origin:http:\/\/127\.0\.0\.1:8765\) \(127\.0\.0\.1\)$/,
    );
  });
});
