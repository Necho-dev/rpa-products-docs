import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSiblingModuleGroups,
  capitalizeGroupKey,
  inferGroupKeyFromFilename,
  OTHER_GROUP_KEY,
  OTHER_GROUP_LABEL,
  packageEntryToFilenamePrefix,
  resolveGroupBucket,
  resolveModuleGroupYamlContext,
} from '@/lib/docs/source/collect-sibling-modules';

describe('packageEntryToFilenamePrefix', () => {
  it('strips -all suffix', () => {
    assert.equal(packageEntryToFilenamePrefix('rpa-conn-qianniu-all'), 'rpa-conn-qianniu-');
  });
});

describe('inferGroupKeyFromFilename', () => {
  it('extracts first segment after package prefix', () => {
    assert.equal(
      inferGroupKeyFromFilename(
        'rpa-conn-qianniu-item-price-flow-limit',
        'rpa-conn-qianniu-all',
      ),
      'item',
    );
    assert.equal(
      inferGroupKeyFromFilename('rpa-conn-alimm-ppxx-foo', 'rpa-conn-alimm-all'),
      'ppxx',
    );
  });
});

describe('resolveGroupBucket', () => {
  const groupsYaml = {
    item: { label: '商品/Item', icon: { comp: 'ShoppingBag', color: '#ea580c' } },
  };

  it('uses YAML config when key is known', () => {
    assert.deepEqual(resolveGroupBucket('item', groupsYaml, false), {
      key: 'item',
      label: '商品/Item',
      icon: { comp: 'ShoppingBag', color: '#ea580c' },
    });
  });

  it('falls back to Other for unknown inferred keys', () => {
    assert.deepEqual(resolveGroupBucket('marketing', groupsYaml, false), {
      key: OTHER_GROUP_KEY,
      label: OTHER_GROUP_LABEL,
    });
  });

  it('uses capitalized key for explicit unknown groups', () => {
    assert.deepEqual(resolveGroupBucket('ppxx', groupsYaml, true), {
      key: 'ppxx',
      label: capitalizeGroupKey('ppxx'),
    });
  });
});

describe('resolveModuleGroupYamlContext', () => {
  it('returns label and icon from parent module-grid YAML', () => {
    const ctx = resolveModuleGroupYamlContext({
      slug: 'rpa-conn-qianniu-item-foo',
      packageEntry: 'rpa-conn-qianniu-all',
      groupsYaml: {
        item: { label: '商品/Item', icon: { comp: 'ShoppingBag', color: '#ea580c' } },
      },
    });
    assert.deepEqual(ctx, {
      groupKey: 'item',
      label: '商品/Item',
      icon: { comp: 'ShoppingBag', color: '#ea580c' },
    });
  });

  it('falls back to Package icon when group has no icon', () => {
    const ctx = resolveModuleGroupYamlContext({
      slug: 'rpa-conn-qianniu-shop-foo',
      packageEntry: 'rpa-conn-qianniu-all',
      groupsYaml: { shop: { label: '店铺/Shop' } },
    });
    assert.deepEqual(ctx.icon, { comp: 'Package' });
  });
});

describe('collectSiblingModuleGroups', () => {
  const groupsYaml = {
    item: { label: '商品/Item' },
    shop: { label: '店铺/Shop' },
  };

  it('uses YAML labels for inferred keys', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-item-foo',
          title: 'Long Title',
          entry: 'rpa.conn.qianniu.item.foo',
          groupExplicit: false,
        },
      ],
      groupsYaml,
      'rpa-conn-qianniu-all',
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]!.key, 'item');
    assert.equal(result[0]!.label, '商品/Item');
    assert.equal(result[0]!.modules[0]!.code, 'rpa.conn.qianniu.item.foo');
  });

  it('accepts flat string group labels from compiled MDX', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-shop-foo',
          title: 'S',
          entry: 'rpa.conn.qianniu.shop.foo',
          groupExplicit: false,
        },
      ],
      { shop: '店铺/Shop' },
      'rpa-conn-qianniu-all',
    );
    assert.equal(result[0]!.label, '店铺/Shop');
  });

  it('puts inferred unknown keys into Other', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-marketing-foo',
          title: 'M',
          entry: 'rpa.conn.qianniu.marketing.foo',
          groupExplicit: false,
        },
      ],
      groupsYaml,
      'rpa-conn-qianniu-all',
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]!.key, OTHER_GROUP_KEY);
    assert.equal(result[0]!.label, OTHER_GROUP_LABEL);
  });

  it('creates tab for explicit group not in YAML', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-alimm-ppxx-foo',
          title: 'P',
          entry: 'rpa.conn.alimm.ppxx.foo',
          moduleGroup: 'ppxx',
          groupExplicit: true,
        },
      ],
      groupsYaml,
      'rpa-conn-alimm-all',
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]!.key, 'ppxx');
    assert.equal(result[0]!.label, capitalizeGroupKey('ppxx'));
  });

  it('skips modules without entry', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-item-no-entry',
          title: 'No Entry',
          groupExplicit: false,
        },
      ],
      groupsYaml,
      'rpa-conn-qianniu-all',
    );
    assert.equal(result.length, 0);
  });

  it('orders YAML keys first, Other last', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-shop-a',
          title: 'S',
          entry: 'rpa.conn.qianniu.shop.a',
          groupExplicit: false,
        },
        {
          slug: 'rpa-conn-qianniu-item-a',
          title: 'I',
          entry: 'rpa.conn.qianniu.item.a',
          groupExplicit: false,
        },
        {
          slug: 'rpa-conn-qianniu-marketing-a',
          title: 'M',
          entry: 'rpa.conn.qianniu.marketing.a',
          groupExplicit: false,
        },
      ],
      groupsYaml,
      'rpa-conn-qianniu-all',
    );
    assert.deepEqual(
      result.map((g) => g.key),
      ['item', 'shop', OTHER_GROUP_KEY],
    );
  });

  it('prefers moduleTitle over title', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-item-a',
          title: 'Long Title',
          moduleTitle: 'Short',
          entry: 'rpa.conn.qianniu.item.a',
          groupExplicit: false,
        },
      ],
      groupsYaml,
      'rpa-conn-qianniu-all',
    );
    assert.equal(result[0]!.modules[0]!.title, 'Short');
  });

  it('passes moduleIcon and moduleUrl to card data', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-all',
          title: '千牛',
          entry: 'rpa-conn-qianniu-all',
          moduleGroup: 'taobao',
          moduleIcon: { comp: 'Bot', color: '#0284c7' },
          moduleUrl: 'https://myseller.taobao.com',
          groupExplicit: true,
        },
      ],
      { taobao: { label: '淘宝 / 天猫' } },
      'connectors',
    );
    const card = result[0]!.modules[0]!;
    assert.deepEqual(card.icon, { comp: 'Bot', color: '#0284c7' });
    assert.equal(card.url, 'https://myseller.taobao.com');
  });

  it('passes comp-only moduleIcon without color', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-all',
          title: '千牛',
          entry: 'rpa-conn-qianniu-all',
          moduleGroup: 'taobao',
          moduleIcon: { comp: 'Bot' },
          groupExplicit: true,
        },
      ],
      { taobao: { label: '淘宝 / 天猫' } },
      'connectors',
    );
    assert.deepEqual(result[0]!.modules[0]!.icon, { comp: 'Bot' });
  });

  it('passes coverUrl to card data', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-item-a',
          title: 'I',
          entry: 'rpa.conn.qianniu.item.a',
          coverUrl: '/og/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-a/cover.png',
          groupExplicit: false,
        },
      ],
      groupsYaml,
      'rpa-conn-qianniu-all',
    );
    assert.equal(
      result[0]!.modules[0]!.coverUrl,
      '/og/docs/connectors/rpa-conn-qianniu-all/rpa-conn-qianniu-item-a/cover.png',
    );
  });
});
