import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { resourceSignSecret } from '../src/lib/auth/auth-config';
import {
  buildResourceSign,
  signResourcePath,
  verifyResourceSignRequest,
  verifyResourceSignValue,
  withResourceSign,
} from '../src/lib/auth/resource-sign';
import { quoteSignSecret } from '../src/lib/docs/selection/quote-sign';

describe('resource-sign', () => {
  const prev = process.env.DOCS_RESOURCE_SIGN_SECRET;
  const pathname = '/resources/images/rpa/_public/images/foo.png';

  before(() => {
    process.env.DOCS_RESOURCE_SIGN_SECRET = 'unit-test-resource-secret';
  });

  after(() => {
    if (prev === undefined) delete process.env.DOCS_RESOURCE_SIGN_SECRET;
    else process.env.DOCS_RESOURCE_SIGN_SECRET = prev;
  });

  it('build + verify 通过', () => {
    const sign = buildResourceSign(pathname);
    assert.ok(sign);
    assert.equal(verifyResourceSignValue(pathname, sign!), true);
  });

  it('过期签名失败', () => {
    const sign = buildResourceSign(pathname, Date.now() - 1);
    assert.ok(sign);
    assert.equal(verifyResourceSignValue(pathname, sign!), false);
  });

  it('篡改 hmac 失败', () => {
    const sign = buildResourceSign(pathname)!;
    const tampered = `${sign.slice(0, -2)}aa`;
    assert.equal(verifyResourceSignValue(pathname, tampered), false);
  });

  it('signResourcePath 与 Request 校验', () => {
    const signed = signResourcePath(pathname);
    assert.ok(signed);
    const req = new Request(`https://docs.example.com${signed}`);
    assert.equal(verifyResourceSignRequest(req), true);
  });

  it('withResourceSign 给站内路径追加 sign', () => {
    const out = withResourceSign(pathname);
    assert.match(out, /^\/resources\/images\/.*\?sign=/);
  });
});

describe('资源签名密钥回退', () => {
  const keys = ['DOCS_RESOURCE_SIGN_SECRET', 'DOCS_QUOTE_SIGN_SECRET', 'DOCS_SESSION_SECRET'] as const;
  const prev = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  function clearSecrets() {
    for (const key of keys) delete process.env[key];
  }

  after(() => {
    for (const key of keys) {
      const value = prev[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('配图与分享图优先使用 DOCS_RESOURCE_SIGN_SECRET', () => {
    clearSecrets();
    process.env.DOCS_RESOURCE_SIGN_SECRET = 'resource';
    process.env.DOCS_QUOTE_SIGN_SECRET = 'quote';
    process.env.DOCS_SESSION_SECRET = 'session';
    assert.equal(resourceSignSecret(), 'resource');
    assert.equal(quoteSignSecret(), 'resource');
  });

  it('未设资源密钥时仍读旧名 DOCS_QUOTE_SIGN_SECRET', () => {
    clearSecrets();
    process.env.DOCS_QUOTE_SIGN_SECRET = 'quote';
    process.env.DOCS_SESSION_SECRET = 'session';
    assert.equal(quoteSignSecret(), 'quote');
    assert.equal(resourceSignSecret(), 'quote');
  });

  it('两个专用密钥都未设时用会话密钥', () => {
    clearSecrets();
    process.env.DOCS_SESSION_SECRET = 'session';
    assert.equal(quoteSignSecret(), 'session');
    assert.equal(resourceSignSecret(), 'session');
  });
});
