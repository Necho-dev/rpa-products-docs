import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import {
  DOCS_CUBE_ORIGIN_COOKIE,
  DOCS_CUBE_USER_COOKIE,
  DOCS_SESSION_COOKIE,
} from '../src/lib/auth/cookie-names';
import {
  formatAccessUserStdoutLabel,
  formatObservabilityStdoutIdentityGroup,
} from '../src/lib/observability/access-log-stdout';
import {
  resolveObservabilityLogAuth,
  resolveObservabilityStdoutIdentity,
  toObservabilityJsonlEntry,
} from '../src/lib/observability/observability-auth';

describe('observability-auth', () => {
  it('SSO 关闭时不写 authorization', () => {
    const prev = process.env.DOCS_CUBE_SSO_ENABLED;
    process.env.DOCS_CUBE_SSO_ENABLED = 'false';
    try {
      const req = new NextRequest('http://127.0.0.1/docs/foo');
      assert.deepEqual(resolveObservabilityStdoutIdentity(req), {});
      assert.equal(resolveObservabilityLogAuth(req).authorization, undefined);
    } finally {
      if (prev === undefined) delete process.env.DOCS_CUBE_SSO_ENABLED;
      else process.env.DOCS_CUBE_SSO_ENABLED = prev;
    }
  });

  it('Cookie 优先：stdout 与 jsonl 共用 accessUser / accessOrigin', () => {
    const prev = process.env.DOCS_CUBE_SSO_ENABLED;
    process.env.DOCS_CUBE_SSO_ENABLED = 'true';
    try {
      const req = new NextRequest('http://127.0.0.1/docs/foo', {
        headers: {
          cookie: `${DOCS_CUBE_USER_COOKIE}=alice; ${DOCS_CUBE_ORIGIN_COOKIE}=https%3A%2F%2Fcube.example.com`,
        },
      });
      const stdout = resolveObservabilityStdoutIdentity(req);
      assert.equal(stdout.accessUser, 'alice');
      assert.equal(stdout.accessOrigin, 'https://cube.example.com');
      assert.equal('authorization' in stdout, false);

      const identity = formatObservabilityStdoutIdentityGroup(stdout, false);
      assert.equal(identity, '(user:alice · origin:https://cube.example.com)');

      const logAuth = resolveObservabilityLogAuth(req);
      assert.equal(logAuth.accessUser, 'alice');
      assert.equal(logAuth.accessOrigin, 'https://cube.example.com');
      assert.equal(logAuth.authorization, undefined);
    } finally {
      if (prev === undefined) delete process.env.DOCS_CUBE_SSO_ENABLED;
      else process.env.DOCS_CUBE_SSO_ENABLED = prev;
    }
  });

  it('jsonl 保留 authorization，stdout 格式化不包含该字段', () => {
    const entry = toObservabilityJsonlEntry({
      type: 'access',
      accessUser: 'alice',
      accessOrigin: 'https://cube.example.com',
      authorization: DOCS_SESSION_COOKIE,
    });
    assert.equal(entry.authorization, DOCS_SESSION_COOKIE);
    assert.equal(entry.accessUser, 'alice');

    const identity = formatObservabilityStdoutIdentityGroup(entry, false);
    assert.equal(identity, '(user:alice · origin:https://cube.example.com)');
    assert.match(formatAccessUserStdoutLabel('alice', true), /\x1b\[36m\x1b\[1malice\x1b\[0m/);
  });
});
