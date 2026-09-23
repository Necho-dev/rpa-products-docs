import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  fetchUserInfoByAuth,
  normalizeUserInfo,
  parseSaasQuery,
  resetUserCentreCache,
  userCentreApiUrl,
} from '../src/lib/auth/user-centre';

describe('user-centre', () => {
  const prevBase = process.env.DOCS_USER_CENTRE_BASE_URL;

  before(() => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
  });

  after(() => {
    resetUserCentreCache();
    if (prevBase === undefined) delete process.env.DOCS_USER_CENTRE_BASE_URL;
    else process.env.DOCS_USER_CENTRE_BASE_URL = prevBase;
  });

  it('parseSaasQuery 只认 true / false，不传或空串为 false', () => {
    assert.equal(parseSaasQuery(null), false);
    assert.equal(parseSaasQuery(''), false);
    assert.equal(parseSaasQuery('  '), false);
    assert.equal(parseSaasQuery('true'), true);
    assert.equal(parseSaasQuery('TRUE'), true);
    assert.equal(parseSaasQuery('false'), false);
    assert.equal(parseSaasQuery('1'), false);
    assert.equal(parseSaasQuery('yes'), false);
    assert.equal(parseSaasQuery('0'), false);
  });

  it('normalizeUserInfo 优先 customerIdentify，缺省回退 tenantId', () => {
    const preferred = normalizeUserInfo({
      userName: 'alice',
      customerIdentify: 'cust-1',
      tenantId: 't-1',
    });
    assert.equal(preferred?.s, 'cust-1');
    assert.equal(preferred?.raw.customerIdentify, 'cust-1');

    const fallback = normalizeUserInfo({
      userName: 'alice',
      tenantId: 't-1',
    });
    assert.equal(fallback?.s, 't-1');
  });

  it('normalizeUserInfo 从 data.ext.cubeOrigin 读取魔方 origin', () => {
    const user = normalizeUserInfo({
      userName: 'alice',
      customerIdentify: 'cust-1',
      ext: { cubeOrigin: 'http://127.0.0.1:8765/' },
    });
    assert.equal(user?.cubeOrigin, 'http://127.0.0.1:8765');
  });

  it('normalizeUserInfo 取 userName + tenantId', () => {
    const user = normalizeUserInfo({
      userName: 'alice',
      name: 'Alice',
      tenantId: 't-1',
      orgId: 'o-1',
    });
    assert.equal(user?.u, 'alice');
    assert.equal(user?.s, 't-1');
    assert.equal(user?.cubeOrigin, null);
  });

  it('normalizeUserInfo 从 data.cubeOrigin 读取魔方 origin', () => {
    const user = normalizeUserInfo({
      userName: 'alice',
      tenantId: 't-1',
      cubeOrigin: 'http://127.0.0.1:8765/',
    });
    assert.equal(user?.cubeOrigin, 'http://127.0.0.1:8765');
  });

  it('normalizeUserInfo 从 extraInfo.cubeOrigin 回退', () => {
    const user = normalizeUserInfo(
      { userName: 'alice', tenantId: 't-1' },
      { cubeOrigin: 'https://cube.example.com' },
    );
    assert.equal(user?.cubeOrigin, 'https://cube.example.com');
  });

  it('normalizeUserInfo 回退 name / orgId', () => {
    const user = normalizeUserInfo({ name: 'Bob', orgId: 'org-9' });
    assert.equal(user?.u, 'Bob');
    assert.equal(user?.s, 'org-9');
  });

  it('normalizeUserInfo 缺用户或租户则失败', () => {
    assert.equal(normalizeUserInfo({ userName: 'x' }), null);
    assert.equal(normalizeUserInfo({ tenantId: 't' }), null);
  });

  it('userCentreApiUrl 原样拼接路径，并去掉基址末尾斜杠', () => {
    assert.equal(
      userCentreApiUrl('/open/oidc/userInfoByAuth'),
      'https://uc.example.com/open/oidc/userInfoByAuth',
    );
    process.env.DOCS_USER_CENTRE_BASE_URL = 'http://test-user-centre.yuce-tech.cn/';
    assert.equal(
      userCentreApiUrl('/open/oidc/userInfoByAuth'),
      'http://test-user-centre.yuce-tech.cn/open/oidc/userInfoByAuth',
    );
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
  });

  it('fetchUserInfoByAuth 解析 success 信封', async () => {
    resetUserCentreCache();
    let called = '';
    const user = await fetchUserInfoByAuth(
      { ed: 'ED', sh: 'SH', sg: 'SG', tm: 1 },
      {
        cache: false,
        fetchImpl: async (input) => {
          called = String(input);
          return new Response(
            JSON.stringify({
              success: true,
              data: { userName: 'dev-user', tenantId: 'tenant-1' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        },
      },
    );
    assert.equal(user?.u, 'dev-user');
    assert.equal(user?.s, 'tenant-1');
    assert.equal(user?.cubeOrigin, null);
    assert.match(called, /\/open\/oidc\/userInfoByAuth\?/);
    assert.match(called, /isSaas=false/);
  });

  it('fetchUserInfoByAuth 把 isSaas=false 传给用户中心', async () => {
    resetUserCentreCache();
    let called = '';
    await fetchUserInfoByAuth(
      { ed: 'ED', sh: 'SH', sg: 'SG', tm: 1, isSaas: false },
      {
        cache: false,
        fetchImpl: async (input) => {
          called = String(input);
          return new Response(JSON.stringify({ success: false }), { status: 200 });
        },
      },
    );
    assert.match(called, /isSaas=false/);
  });

  it('fetchUserInfoByAuth success=false 返回 null', async () => {
    resetUserCentreCache();
    const user = await fetchUserInfoByAuth(
      { ed: 'ED', sh: 'SH', sg: 'SG', tm: 1 },
      {
        cache: false,
        fetchImpl: async () =>
          new Response(JSON.stringify({ success: false, msg: 'bad' }), { status: 200 }),
      },
    );
    assert.equal(user, null);
  });

  it('fetchUserInfoByAuth 从 extraInfo.cubeOrigin 回退', async () => {
    resetUserCentreCache();
    const user = await fetchUserInfoByAuth(
      { ed: 'ED', sh: 'SH', sg: 'SG', tm: 1 },
      {
        cache: false,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: { userName: 'dev-user', tenantId: 'tenant-1' },
              extraInfo: { cubeOrigin: 'https://cube.example.com' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      },
    );
    assert.equal(user?.cubeOrigin, 'https://cube.example.com');
  });
});
