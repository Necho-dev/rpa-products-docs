import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyLink,
  docsPathAndHashFromHref,
  isDocsPathname,
  isPureHashHref,
} from '../src/lib/docs/link-kind';
import { encodePeekTarget, parsePeekTarget, shouldRenderPeekFromCookie } from '../src/lib/docs/doc-peek';

const origin = 'https://knowledge.example.com';
const pageUrl = `${origin}/docs/rpa/foo`;

describe('isPureHashHref', () => {
  it('treats empty, # and #section as hash', () => {
    assert.equal(isPureHashHref(undefined), true);
    assert.equal(isPureHashHref('#'), true);
    assert.equal(isPureHashHref('#背景信息'), true);
  });

  it('does not treat hash paths as pure anchors', () => {
    assert.equal(isPureHashHref('#/docs/foo'), false);
  });
});

describe('isDocsPathname', () => {
  it('matches /docs and nested modules including /docs/auth', () => {
    assert.equal(isDocsPathname('/docs'), true);
    assert.equal(isDocsPathname('/docs/rpa/x'), true);
    assert.equal(isDocsPathname('/docs/auth/login-help'), true);
  });

  it('excludes access gate and non-docs paths', () => {
    assert.equal(isDocsPathname('/docs/access'), false);
    assert.equal(isDocsPathname('/'), false);
    assert.equal(isDocsPathname('/mcp'), false);
    assert.equal(isDocsPathname('/auth/login'), false);
  });
});

describe('classifyLink', () => {
  it('classifies hash, external, docs, and other same-origin', () => {
    assert.equal(classifyLink('#toc', pageUrl), 'hash');
    assert.equal(
      classifyLink('https://channels.weixin.qq.com/promote', pageUrl),
      'external',
    );
    assert.equal(classifyLink('//cdn.example.net/a.js', pageUrl), 'external');
    assert.equal(classifyLink('mailto:ops@example.com', pageUrl), 'external');
    assert.equal(classifyLink('/docs/auth/robots', pageUrl), 'docs');
    assert.equal(classifyLink(`${origin}/docs/rpa/bar`, pageUrl), 'docs');
    assert.equal(classifyLink('/', pageUrl), 'same-origin-other');
    assert.equal(classifyLink('/mcp', pageUrl), 'same-origin-other');
    assert.equal(classifyLink('/auth/login', pageUrl), 'same-origin-other');
    assert.equal(classifyLink('/docs/access', pageUrl), 'same-origin-other');
  });
});

describe('docsPathAndHashFromHref', () => {
  it('extracts path and hash for docs links', () => {
    assert.deepEqual(docsPathAndHashFromHref('/docs/auth/foo#加签', pageUrl), {
      path: '/docs/auth/foo',
      hash: '#加签',
    });
  });

  it('returns null for non-docs', () => {
    assert.equal(docsPathAndHashFromHref('https://example.com', pageUrl), null);
  });
});

describe('parsePeekTarget', () => {
  it('parses path and hash from cookie/target value', () => {
    assert.deepEqual(parsePeekTarget('/docs/auth/foo#背景'), {
      path: '/docs/auth/foo',
      hash: '#背景',
    });
    assert.deepEqual(parsePeekTarget(encodeURIComponent('/docs/auth/foo#背景')), {
      path: '/docs/auth/foo',
      hash: '#背景',
    });
    assert.equal(parsePeekTarget('/mcp'), null);
    assert.equal(parsePeekTarget(undefined), null);
  });

  it('encodes path and hash for the cookie value', () => {
    assert.equal(encodePeekTarget('/docs/auth/bar', '#x'), '/docs/auth/bar#x');
  });
});

describe('shouldRenderPeekFromCookie', () => {
  function headers(map: Record<string, string>) {
    return { get: (name: string) => map[name] ?? null };
  }

  it('renders peek on refresh-like requests, not full document loads or prefetch', () => {
    assert.equal(shouldRenderPeekFromCookie(headers({})), true);
    assert.equal(shouldRenderPeekFromCookie(headers({ rsc: '1' })), true);
    assert.equal(
      shouldRenderPeekFromCookie(headers({ 'sec-fetch-dest': 'empty' })),
      true,
    );
    assert.equal(
      shouldRenderPeekFromCookie(headers({ 'sec-fetch-dest': 'document' })),
      false,
    );
    assert.equal(
      shouldRenderPeekFromCookie(headers({ 'next-router-prefetch': '1' })),
      false,
    );
  });
});
