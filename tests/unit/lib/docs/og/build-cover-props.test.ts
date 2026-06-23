import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterCoverTags } from '@/lib/docs/og/cover-tags';

describe('filterCoverTags', () => {
  it('returns first two tags when no group label', () => {
    assert.deepEqual(filterCoverTags(['文件导出', '批量查询', '商品'], undefined), [
      '文件导出',
      '批量查询',
    ]);
  });

  it('filters tags matching group label parts', () => {
    assert.deepEqual(
      filterCoverTags(['商品', '文件导出'], '商品/Item'),
      ['文件导出'],
    );
  });

  it('falls back to original tags when all filtered out', () => {
    assert.deepEqual(filterCoverTags(['商品'], '商品/Item'), ['商品']);
  });

  it('returns empty for missing tags', () => {
    assert.deepEqual(filterCoverTags(undefined, '商品/Item'), []);
  });
});
