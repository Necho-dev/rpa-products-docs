import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSiblingModuleGroups,
  capitalizeGroupKey,
  inferGroupKeyByKeyword,
  OTHER_GROUP_KEY,
  OTHER_GROUP_LABEL,
  resolveGroupBucket,
  resolveModuleGroupYamlContext,
  tokenizeModuleIdentifier,
} from '@/lib/docs/source/collect-sibling-modules';

describe('tokenizeModuleIdentifier', () => {
  it('splits slug by hyphen and entry by dot', () => {
    assert.deepEqual(
      new Set(
        tokenizeModuleIdentifier(
          'rpa-conn-alimm-ppxx-data-center',
          'rpa.conn.alimm.ppxx.data.center',
        ),
      ),
      new Set([
        'rpa',
        'conn',
        'alimm',
        'ppxx',
        'data',
        'center',
      ]),
    );
  });
});

describe('inferGroupKeyByKeyword', () => {
  it('matches YAML group keys against slug/entry tokens in declaration order', () => {
    assert.equal(
      inferGroupKeyByKeyword(
        'rpa-conn-qianniu-item-price-flow-limit',
        'rpa.conn.qianniu.item.price.flow.limit',
        ['item', 'shop'],
      ),
      'item',
    );
    assert.equal(
      inferGroupKeyByKeyword(
        'rpa-conn-alimm-ppxx-foo',
        'rpa.conn.alimm.ppxx.foo',
        ['pxb', 'wxt', 'ppxx', 'tblm', 'dmp'],
      ),
      'ppxx',
    );
  });

  it('returns undefined when no group key token is present', () => {
    assert.equal(
      inferGroupKeyByKeyword(
        'rpa-conn-qianniu-marketing-foo',
        'rpa.conn.qianniu.marketing.foo',
        ['item', 'shop'],
      ),
      undefined,
    );
  });

  it('prefers earlier YAML keys when multiple tokens match', () => {
    assert.equal(
      inferGroupKeyByKeyword(
        'rpa-conn-demo-item-shop-mix',
        'rpa.conn.demo.item.shop.mix',
        ['shop', 'item'],
      ),
      'shop',
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
  it('returns label and icon from parent module-grid YAML via keyword match', () => {
    const ctx = resolveModuleGroupYamlContext({
      slug: 'rpa-conn-qianniu-item-foo',
      entry: 'rpa.conn.qianniu.item.foo',
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
      entry: 'rpa.conn.qianniu.shop.foo',
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

  it('uses YAML labels for keyword-inferred keys', () => {
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
    );
    assert.equal(result[0]!.label, '店铺/Shop');
  });

  it('puts unmatched modules into Other', () => {
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
          group: 'ppxx',
          groupExplicit: true,
        },
      ],
      groupsYaml,
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]!.key, 'ppxx');
    assert.equal(result[0]!.label, capitalizeGroupKey('ppxx'));
  });

  it('includes modules without entry when slug is present', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-credential',
          title: '账密托管',
          group: 'rpa',
          groupExplicit: true,
        },
      ],
      { rpa: { label: '账密托管' } },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]!.key, 'rpa');
    assert.equal(result[0]!.modules[0]!.code, undefined);
  });

  it('skips modules without group and without slug', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: '',
          title: 'Empty',
          groupExplicit: false,
        },
      ],
      groupsYaml,
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
    );
    assert.deepEqual(
      result.map((g) => g.key),
      ['item', 'shop', OTHER_GROUP_KEY],
    );
  });

  it('prefers cardTitle over title', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'rpa-conn-qianniu-item-a',
          title: 'Long Title',
          cardTitle: 'Short',
          entry: 'rpa.conn.qianniu.item.a',
          groupExplicit: false,
        },
      ],
      groupsYaml,
    );
    assert.equal(result[0]!.modules[0]!.title, 'Short');
  });

  it('passes module icon and link to card data', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'RPA_QIANNIU',
          title: '千牛',
          entry: 'RPA_QIANNIU',
          group: 'taobao',
          icon: { comp: 'Bot', color: '#0284c7' },
          link: 'https://myseller.taobao.com',
          groupExplicit: true,
        },
      ],
      { taobao: { label: '淘宝 / 天猫' } },
    );
    const card = result[0]!.modules[0]!;
    assert.deepEqual(card.icon, { comp: 'Bot', color: '#0284c7' });
    assert.equal(card.url, 'https://myseller.taobao.com');
  });

  it('passes comp-only icon without color', () => {
    const result = collectSiblingModuleGroups(
      [
        {
          slug: 'RPA_QIANNIU',
          title: '千牛',
          entry: 'RPA_QIANNIU',
          group: 'taobao',
          icon: { comp: 'Bot' },
          groupExplicit: true,
        },
      ],
      { taobao: { label: '淘宝 / 天猫' } },
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
          coverUrl: '/og/docs/RPA_QIANNIU/rpa-conn-qianniu-item-a/cover.png',
          groupExplicit: false,
        },
      ],
      groupsYaml,
    );
    assert.equal(
      result[0]!.modules[0]!.coverUrl,
      '/og/docs/RPA_QIANNIU/rpa-conn-qianniu-item-a/cover.png',
    );
  });
});
