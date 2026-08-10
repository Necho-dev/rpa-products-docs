import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  authorizeDocsImageRequest,
  isPublicResourceRelativePath,
  type AuthorizeDocsImageDeps,
} from '@/lib/auth/resources-auth';
import type { AuthContext } from '@/lib/auth/auth-core';

function req(): Request {
  return new Request('http://127.0.0.1:3000/resources/images/rpa/_public/images/a.png');
}

function auth(partial: Partial<AuthContext>): AuthContext {
  return {
    session: null,
    mcp: null,
    isAuthenticated: false,
    sessionNeedsReauth: false,
    ...partial,
  };
}

const locked: AuthorizeDocsImageDeps = {
  requireEmbedSign: () => true,
  isSsoEnabled: () => true,
  publicPrefixes: () => ['_public/_shared'],
  verifyHmac: () => false,
  resolveAuth: () => auth({}),
};

describe('isPublicResourceRelativePath', () => {
  it('matches builtin shared prefix only when listed', () => {
    assert.equal(
      isPublicResourceRelativePath('_public/_shared/platform/files/DEWU.png', [
        '_public/_shared',
      ]),
      true,
    );
    assert.equal(
      isPublicResourceRelativePath(
        'rpa/_public/images/qianniu/foo.png',
        ['_public/_shared'],
      ),
      false,
    );
  });
});

describe('authorizeDocsImageRequest', () => {
  it('opens all images when embed sign is disabled', () => {
    const out = authorizeDocsImageRequest(req(), 'rpa/_public/images/a.png', {
      ...locked,
      requireEmbedSign: () => false,
    });
    assert.deepEqual(out, { ok: true, via: 'open' });
  });

  it('allows configured public prefixes anonymously', () => {
    const out = authorizeDocsImageRequest(
      req(),
      '_public/_shared/platform/files/DEWU.png',
      locked,
    );
    assert.deepEqual(out, { ok: true, via: 'public' });
  });

  it('allows embed HMAC without session (docsResources 回源)', () => {
    const out = authorizeDocsImageRequest(req(), 'rpa/_public/images/a.png', {
      ...locked,
      verifyHmac: () => true,
    });
    assert.deepEqual(out, { ok: true, via: 'hmac' });
  });

  it('does not treat MCP bearer as HTTP image auth (use get_docs_image)', () => {
    const out = authorizeDocsImageRequest(req(), 'rpa/_public/images/a.png', {
      ...locked,
      resolveAuth: () =>
        auth({
          mcp: { u: 'u', s: 's', aud: 'http://x/mcp', t: 1 },
          isAuthenticated: true,
        }),
    });
    assert.deepEqual(out, { ok: false });
  });

  it('allows browser session cookie', () => {
    const out = authorizeDocsImageRequest(req(), 'rpa/_public/images/a.png', {
      ...locked,
      resolveAuth: () =>
        auth({
          session: { u: 'u', s: 's', t: 1, iat: 1 },
          isAuthenticated: true,
        }),
    });
    assert.deepEqual(out, { ok: true, via: 'session' });
  });

  it('rejects anonymous doc screenshots when SSO + embed sign are on', () => {
    const out = authorizeDocsImageRequest(
      req(),
      'rpa/_public/images/qianniu/foo.png',
      locked,
    );
    assert.deepEqual(out, { ok: false });
  });

  it('does not block local debug when SSO is off even if embed sign forced', () => {
    const out = authorizeDocsImageRequest(req(), 'rpa/_public/images/a.png', {
      ...locked,
      isSsoEnabled: () => false,
      resolveAuth: () => auth({ isAuthenticated: true }),
    });
    assert.deepEqual(out, { ok: true, via: 'open' });
  });
});
