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
  const docsRel =
    'rpa/_public/images/qianniu/finance_bail_account_detail_20260715.png';

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

  it('rewrites __imgN to content/docs-relative paths for MCP', () => {
    const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
      siteOrigin: 'http://127.0.0.1:3000',
      docsRelativePaths: true,
    });
    assert.match(out, new RegExp(`src="${docsRel}"`));
    assert.doesNotMatch(out, /resources\/images|__img0/);
  });

  it('falls back to site-relative /resources/images when siteOrigin is missing', () => {
    const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {});
    assert.match(
      out,
      /src="\/resources\/images\/rpa\/_public\/images\/qianniu\/finance_bail_account_detail_20260715\.png"/,
    );
  });

  it('rewrites to cube docsResources when cubeOrigin is set', () => {
    const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
      cubeOrigin: 'https://cube.example.com',
    });
    assert.match(
      out,
      /src="https:\/\/cube\.example\.com\/docsResources\?path=rpa%2F_public%2Fimages%2Fqianniu%2Ffinance_bail_account_detail_20260715\.png"/,
    );
  });

  it('omits images when embed cubeOrigin is explicitly missing', () => {
    const out = rewriteMarkdownImagesForEmbed(processed, raw, docPath, {
      cubeOrigin: null,
    });
    assert.equal(out, '');
    assert.doesNotMatch(out, /resources\/images|__img0/);
  });
});
