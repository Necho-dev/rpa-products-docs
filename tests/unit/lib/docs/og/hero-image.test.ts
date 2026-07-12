import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractMarkdownIncludeTargets,
  resolveHeroImageRelativePath,
  resolveHeroImageRelativePathWithIncludes,
} from '@/lib/docs/og/hero-image';

describe('extractMarkdownIncludeTargets', () => {
  it('extracts leaf directive includes', () => {
    assert.deepEqual(
      extractMarkdownIncludeTargets('::include[./qianniu.md]\n'),
      ['./qianniu.md'],
    );
  });

  it('strips hash fragments', () => {
    assert.deepEqual(
      extractMarkdownIncludeTargets('::include[./qianniu.md#section]\n'),
      ['./qianniu.md'],
    );
  });

  it('skips codeblock includes with lang', () => {
    assert.deepEqual(
      extractMarkdownIncludeTargets('::include[./script.ts]{lang=ts}\n'),
      [],
    );
  });

  it('extracts JSX includes and skips lang=', () => {
    assert.deepEqual(
      extractMarkdownIncludeTargets('<include>./another.mdx</include>'),
      ['./another.mdx'],
    );
    assert.deepEqual(
      extractMarkdownIncludeTargets('<include lang="md">./page.md</include>'),
      [],
    );
  });
});

describe('resolveHeroImageRelativePath', () => {
  it('resolves first local image relative to page', () => {
    const raw =
      'Intro\n\n![x](../_public/images/ACCOUNT_PASSWORD/RPA_DOUDIAN/a.png)\n';
    assert.equal(
      resolveHeroImageRelativePath('auth/ACCOUNT_PASSWORD/RPA_DOUDIAN.md', raw),
      'auth/_public/images/ACCOUNT_PASSWORD/RPA_DOUDIAN/a.png',
    );
  });

  it('returns null when only include is present', () => {
    assert.equal(
      resolveHeroImageRelativePath(
        'auth/ACCOUNT_PASSWORD/RPA_ALIMM.md',
        '::include[./RPA_QIANNIU.md]\n',
      ),
      null,
    );
  });
});

describe('resolveHeroImageRelativePathWithIncludes', () => {
  it('follows ::include to resolve hero image from included doc', async () => {
    const raw = `---
title: 阿里妈妈
---

::include[./RPA_QIANNIU.md]
`;
    const relative = await resolveHeroImageRelativePathWithIncludes(
      'auth/ACCOUNT_PASSWORD/RPA_ALIMM.md',
      raw,
    );

    assert.ok(relative);
    assert.match(
      relative!,
      /auth\/_public\/images\/ACCOUNT_PASSWORD\/RPA_QIANNIU\//,
    );
    assert.match(relative!, /\.png$/);
  });
});
