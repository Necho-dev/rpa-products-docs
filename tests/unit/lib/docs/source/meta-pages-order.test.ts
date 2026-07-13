import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareBySlugOrder,
  normalizeMetaPageEntry,
  parseMetaPagesOrder,
} from '@/lib/docs/source/meta-pages-order';
import { collectSiblingModuleGroups } from '@/lib/docs/source/collect-sibling-modules';

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

describe('collectSiblingModuleGroups pagesOrder', () => {
  it('sorts modules within a group by meta pages order', () => {
    const result = collectSiblingModuleGroups(
      [
        { slug: 'RPA_ALIMM', title: '阿里妈妈', group: 'rpa', groupExplicit: true },
        { slug: 'RPA_QIANNIU', title: '千牛', group: 'rpa', groupExplicit: true },
        { slug: 'RPA_SYCM', title: '生意参谋', group: 'rpa', groupExplicit: true },
        { slug: 'RPA_DOUDIAN', title: '抖店', group: 'rpa', groupExplicit: true },
        { slug: 'RPA_PINDUODUO', title: '拼多多', group: 'rpa', groupExplicit: true },
      ],
      { rpa: { label: '账密托管' } },
      [
        'RPA_QIANNIU',
        'RPA_SYCM',
        'RPA_ALIMM',
        'RPA_DOUDIAN',
        'RPA_PINDUODUO',
      ],
    );

    assert.deepEqual(
      result[0]!.modules.map((m) => m.href.replace(/^\.\//, '')),
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
