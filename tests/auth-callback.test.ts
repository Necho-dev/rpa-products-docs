import assert from 'node:assert/strict';
import { createCipheriv, createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { GET as callbackGET } from '../src/app/auth/callback/route';
import { verifyCubeEmbedRequest } from '../src/lib/auth/cube-embed';
import { resetSecretsCache, sha256Hex } from '../src/lib/auth/cube';
import { resetUserCentreCache } from '../src/lib/auth/user-centre';

const SECRET = '0123456789abcdef';
const SH = createHash('sha256').update(SECRET, 'utf8').digest('hex');

function aesEcbEncrypt(plain: string, keyAscii: string): string {
  const key = Buffer.from(keyAscii, 'ascii');
  const cipher = createCipheriv(`aes-${key.length * 8}-ecb`, key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('base64');
}

function wrap(payload: Record<string, string>, tm = Date.now()) {
  const ed = aesEcbEncrypt(JSON.stringify(payload), SECRET);
  const sg = sha256Hex(`${ed}${tm}${SECRET}`);
  return { ed, sh: SH, sg, tm };
}

describe('auth callback userInfoByAuth + AES 回退', () => {
  const prevUc = process.env.DOCS_USER_CENTRE_BASE_URL;
  const prevSecrets = process.env.DOCS_SECRETS_FILE_PATH;
  const prevSession = process.env.DOCS_SESSION_SECRET;
  let dir: string;
  let originalFetch: typeof fetch;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'docs-cb-'));
    const file = join(dir, 'secrets.json');
    writeFileSync(file, JSON.stringify({ [SH]: SECRET }));
    process.env.DOCS_SESSION_SECRET = 'callback-test-session-secret-32b!!';
    process.env.DOCS_SECRETS_FILE_PATH = file;
    originalFetch = globalThis.fetch;
    resetSecretsCache();
    resetUserCentreCache();
  });

  after(() => {
    globalThis.fetch = originalFetch;
    resetUserCentreCache();
    resetSecretsCache();
    rmSync(dir, { recursive: true, force: true });
    if (prevUc === undefined) delete process.env.DOCS_USER_CENTRE_BASE_URL;
    else process.env.DOCS_USER_CENTRE_BASE_URL = prevUc;
    if (prevSecrets === undefined) delete process.env.DOCS_SECRETS_FILE_PATH;
    else process.env.DOCS_SECRETS_FILE_PATH = prevSecrets;
    if (prevSession === undefined) delete process.env.DOCS_SESSION_SECRET;
    else process.env.DOCS_SESSION_SECRET = prevSession;
  });

  it('用户中心成功时写 Cookie，不依赖本地解密', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            userName: 'uc-user',
            tenantId: 'tenant-uc',
            cubeOrigin: 'http://127.0.0.1:8765',
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'ignored' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}&redirect=${encodeURIComponent('/docs/rpa')}`;
    const res = await callbackGET(new Request(url));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/docs/rpa');
    const cookies = res.headers.get('set-cookie') ?? '';
    assert.match(cookies, /DOCSESSION=/);
    assert.match(cookies, /ACCESSORIGIN=/);
  });

  it('callback 的 saas=false 转成用户中心 isSaas=false', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    let called = '';
    globalThis.fetch = (async (input) => {
      called = String(input);
      return new Response(
        JSON.stringify({
          success: true,
          data: { userName: 'uc-user', tenantId: 'tenant-uc' },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'ignored' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}&saas=false&redirect=${encodeURIComponent('/docs')}`;
    const res = await callbackGET(new Request(url));
    assert.equal(res.status, 302);
    assert.match(called, /isSaas=false/);
  });

  it('用户中心失败时回退 secrets.json AES', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({
      userName: 'aes-user',
      targetUrl: '/docs',
      cubeOrigin: 'http://127.0.0.1:8765',
    });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}&redirect=${encodeURIComponent('/docs')}`;
    const res = await callbackGET(new Request(url));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/docs');
  });

  it('redirect 含 mode= 拒绝', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: { userName: 'uc-user', tenantId: 'tenant-uc' },
        }),
        { status: 200 },
      )) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'x' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}&redirect=${encodeURIComponent('/docs/foo?mode=page')}`;
    const res = await callbackGET(new Request(url));
    assert.equal(res.status, 400);
  });

  it('用户中心未回 cubeOrigin 时用 Referer 兜底写 ACCESSORIGIN', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: { userName: 'uc-user', tenantId: 'tenant-uc' },
        }),
        { status: 200 },
      )) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'ignored' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}&redirect=${encodeURIComponent('/docs')}`;
    const res = await callbackGET(
      new Request(url, { headers: { referer: 'http://127.0.0.1:8765/api/docsAuth?redirect=/docs' } }),
    );
    assert.equal(res.status, 302);
    const cookies = res.headers.get('set-cookie') ?? '';
    assert.match(cookies, /ACCESSORIGIN=/);
    assert.match(cookies, /127\.0\.0\.1%3A8765/);
  });

  it('用户中心返回的 cubeOrigin 优先于 Referer', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            userName: 'uc-user',
            tenantId: 'tenant-uc',
            cubeOrigin: 'http://127.0.0.1:8765',
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'ignored' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}&redirect=${encodeURIComponent('/docs')}`;
    const res = await callbackGET(
      new Request(url, { headers: { referer: 'https://cube.example.com/app' } }),
    );
    const cookies = res.headers.get('set-cookie') ?? '';
    assert.match(cookies, /127\.0\.0\.1%3A8765/);
    assert.doesNotMatch(cookies, /cube\.example\.com/);
  });

  it('未配置用户中心时不发请求，直接用 secrets.json', async () => {
    delete process.env.DOCS_USER_CENTRE_BASE_URL;
    resetUserCentreCache();
    let called = 0;
    globalThis.fetch = (async () => {
      called += 1;
      throw new Error('should not fetch');
    }) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'aes-user' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}`;
    const res = await callbackGET(new Request(url));
    assert.equal(called, 0);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/docs');
  });

  it('用户中心网络失败时回退 secrets.json', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'aes-user' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}`;
    const res = await callbackGET(new Request(url));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/docs');
  });

  it('用户中心 HTTP 5xx 时回退 secrets.json', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () => new Response('unavailable', { status: 503 })) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'aes-user' });
    const url = `http://127.0.0.1:3000/auth/callback?ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}`;
    const res = await callbackGET(new Request(url));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/docs');
  });

  it('嵌入在用户中心失败时同样回退 secrets.json', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;

    const { ed, sh, sg, tm } = wrap({ userName: 'embed-aes' });
    const url = `http://127.0.0.1:3000/docs/rpa?mode=page&ed=${encodeURIComponent(ed)}&sh=${sh}&sg=${sg}&tm=${tm}`;
    const result = await verifyCubeEmbedRequest(
      new Request(url, { headers: { referer: 'http://127.0.0.1:8765/embed' } }),
    );
    assert.ok(result);
    assert.equal(result.user, 'embed-aes');
    assert.equal(result.sh, SH);
    assert.equal(result.cubeOrigin, 'http://127.0.0.1:8765');
  });

  it('用户中心与 secrets.json 都失败时嵌入拒绝', async () => {
    process.env.DOCS_USER_CENTRE_BASE_URL = 'https://uc.example.com';
    resetUserCentreCache();
    globalThis.fetch = (async () => new Response('no', { status: 500 })) as typeof fetch;

    const { ed, sg, tm } = wrap({ userName: 'embed-aes' });
    const url = `http://127.0.0.1:3000/docs/rpa?mode=page&ed=${encodeURIComponent(ed)}&sh=${'f'.repeat(64)}&sg=${sg}&tm=${tm}`;
    const result = await verifyCubeEmbedRequest(new Request(url));
    assert.equal(result, null);
  });
});
