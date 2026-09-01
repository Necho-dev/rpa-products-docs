import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchesListPageFilters } from '../src/lib/docs/list-page-filters';
import { resolveOpenDocumentationHref } from '../src/lib/docs/open-doc-ai-tools';

describe('list_docs 过滤', () => {
  it('tag 匹配分区 slug', () => {
    assert.equal(matchesListPageFilters('/docs/rpa/RPA_QIANNIU', { tag: 'rpa' }), true);
    assert.equal(matchesListPageFilters('/docs/auth/YUCE_RPA', { tag: 'rpa' }), false);
    assert.equal(matchesListPageFilters('/docs', { tag: 'rpa' }), false);
  });

  it('prefix 包含自身与子孙', () => {
    const prefix = '/docs/rpa/RPA_QIANNIU';
    assert.equal(matchesListPageFilters(prefix, { prefix }), true);
    assert.equal(matchesListPageFilters(`${prefix}/foo`, { prefix }), true);
    assert.equal(matchesListPageFilters('/docs/rpa/RPA_OTHER', { prefix }), false);
  });

  it('tag 与 prefix 同时生效（AND）', () => {
    assert.equal(
      matchesListPageFilters('/docs/rpa/RPA_QIANNIU/x', { tag: 'rpa', prefix: '/docs/rpa/RPA_QIANNIU' }),
      true,
    );
    assert.equal(
      matchesListPageFilters('/docs/auth/YUCE_RPA', { tag: 'rpa', prefix: '/docs/auth' }),
      false,
    );
  });
});

describe('打开文档路径', () => {
  it('规范化 /docs 路径并保留 hash', () => {
    assert.equal(resolveOpenDocumentationHref('/docs/rpa/foo#bar'), '/docs/rpa/foo#bar');
    assert.equal(resolveOpenDocumentationHref('https://example.com/docs/rpa/foo'), '/docs/rpa/foo');
  });

  it('拒绝非文档路径', () => {
    assert.equal(resolveOpenDocumentationHref('/mcp/deeplink'), null);
    assert.equal(resolveOpenDocumentationHref('/docs/access'), null);
  });
});
