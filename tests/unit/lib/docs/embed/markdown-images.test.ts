import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveDocRelativeImagePath,
  rewriteMarkdownImagesForEmbed,
} from '@/lib/docs/embed/markdown';

describe('resolveDocRelativeImagePath', () => {
  it('resolves ../_public paths relative to the doc file', () => {
    assert.equal(
      resolveDocRelativeImagePath(
        '../_public/images/qianniu/finance_bail_account_detail_20260715.png',
        'rpa/RPA_QIANNIU/rpa-conn-qianniu-finance-bail-account-detail.md',
      ),
      'rpa/_public/images/qianniu/finance_bail_account_detail_20260715.png',
    );
  });
});

describe('rewriteMarkdownImagesForEmbed', () => {
  const docPath =
    'rpa/RPA_QIANNIU/rpa-conn-qianniu-finance-bail-account-detail.md';
  const raw = [
    '### 目标页面',
    '',
    '![千牛—保证金账户—结算资金账单明细](../_public/images/qianniu/finance_bail_account_detail_20260715.png)',
    '',
  ].join('\n');
  const processed =
    '<img alt="千牛—保证金账户—结算资金账单明细" src="__img0" />';

  it('rewrites __imgN to absolute site resource URLs for llms.mdx', () => {
    const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
      siteOrigin: 'http://127.0.0.1:3000',
    });
    assert.match(
      out,
      /src="http:\/\/127\.0\.0\.1:3000\/resources\/images\/rpa\/_public\/images\/qianniu\/finance_bail_account_detail_20260715\.png"/,
    );
    assert.doesNotMatch(out, /__img0/);
  });

  it('rewrites __imgN to signed docs resource URLs', () => {
    const prev = process.env.DOCS_RESOURCE_SIGN_SECRET;
    process.env.DOCS_RESOURCE_SIGN_SECRET = 'unit-test-resource-secret';
    try {
      const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
        siteOrigin: 'http://127.0.0.1:3000',
        signResources: true,
      });
      assert.match(
        out,
        /src="http:\/\/127\.0\.0\.1:3000\/resources\/images\/rpa\/_public\/images\/qianniu\/finance_bail_account_detail_20260715\.png\?sign=\d+\.[0-9a-f]+"/,
      );
      assert.doesNotMatch(out, /__img0/);
    } finally {
      if (prev === undefined) delete process.env.DOCS_RESOURCE_SIGN_SECRET;
      else process.env.DOCS_RESOURCE_SIGN_SECRET = prev;
    }
  });

  it('falls back to site-relative /resources/images when siteOrigin is missing', () => {
    const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {});
    assert.match(
      out,
      /src="\/resources\/images\/rpa\/_public\/images\/qianniu\/finance_bail_account_detail_20260715\.png"/,
    );
  });

  it('rewrites to signed docs resource URLs when signResources is set', () => {
    const prev = process.env.DOCS_RESOURCE_SIGN_SECRET;
    process.env.DOCS_RESOURCE_SIGN_SECRET = 'unit-test-resource-secret';
    try {
      const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
        siteOrigin: 'https://docs.example.com',
        signResources: true,
      });
      assert.match(
        out,
        /src="https:\/\/docs\.example\.com\/resources\/images\/rpa\/_public\/images\/qianniu\/finance_bail_account_detail_20260715\.png\?sign=\d+\.[0-9a-f]+"/,
      );
    } finally {
      if (prev === undefined) delete process.env.DOCS_RESOURCE_SIGN_SECRET;
      else process.env.DOCS_RESOURCE_SIGN_SECRET = prev;
    }
  });

  it('omits images when signResources is set but no signing secret', () => {
    const prevRes = process.env.DOCS_RESOURCE_SIGN_SECRET;
    const prevQuote = process.env.DOCS_QUOTE_SIGN_SECRET;
    const prevSession = process.env.DOCS_SESSION_SECRET;
    delete process.env.DOCS_RESOURCE_SIGN_SECRET;
    delete process.env.DOCS_QUOTE_SIGN_SECRET;
    delete process.env.DOCS_SESSION_SECRET;
    try {
      const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
        siteOrigin: 'https://docs.example.com',
        signResources: true,
      });
      assert.equal(out, '');
    } finally {
      if (prevRes === undefined) delete process.env.DOCS_RESOURCE_SIGN_SECRET;
      else process.env.DOCS_RESOURCE_SIGN_SECRET = prevRes;
      if (prevQuote === undefined) delete process.env.DOCS_QUOTE_SIGN_SECRET;
      else process.env.DOCS_QUOTE_SIGN_SECRET = prevQuote;
      if (prevSession === undefined) delete process.env.DOCS_SESSION_SECRET;
      else process.env.DOCS_SESSION_SECRET = prevSession;
    }
  });
});
