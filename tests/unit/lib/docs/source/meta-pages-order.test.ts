import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareBySlugOrder,
  normalizeMetaPageEntry,
  parseMetaPagesOrder,
} from '@/lib/docs/source/meta-pages-order';

describe('normalizeMetaPageEntry', () => {
  it('strips ./ and trailing slash', () => {
    assert.equal(normalizeMetaPageEntry('./RPA_QIANNIU'), 'RPA_QIANNIU');
    assert.equal(normalizeMetaPageEntry('RPA_SYCM/'), 'RPA_SYCM');
  });

  it('skips index and separators', () => {
    assert.equal(normalizeMetaPageEntry('index'), undefined);
    assert.equal(normalizeMetaPageEntry('...'), undefined);
    assert.equal(normalizeMetaPageEntry('---'), undefined);
    assert.equal(normalizeMetaPageEntry('  '), undefined);
  });
});

describe('parseMetaPagesOrder', () => {
  it('parses pages array like sidebar meta.json', () => {
    assert.deepEqual(
      parseMetaPagesOrder([
        'index',
        './RPA_QIANNIU',
        './RPA_SYCM',
        './RPA_ALIMM',
        './RPA_DOUDIAN',
        './RPA_PINDUODUO',
      ]),
      [
        'RPA_QIANNIU',
        'RPA_SYCM',
        'RPA_ALIMM',
        'RPA_DOUDIAN',
        'RPA_PINDUODUO',
      ],
    );
  });
});

describe('compareBySlugOrder', () => {
  it('follows pages order, then localeCompare for unknowns', () => {
    const order = ['RPA_QIANNIU', 'RPA_SYCM', 'RPA_ALIMM'];
    assert.ok(compareBySlugOrder('RPA_QIANNIU', 'RPA_ALIMM', order) < 0);
    assert.ok(compareBySlugOrder('RPA_ALIMM', 'RPA_ZZZ', order) < 0);
    assert.ok(compareBySlugOrder('RPA_AAA', 'RPA_BBB', []) < 0);
  });
});
