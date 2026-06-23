import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseModuleGridBlockFromRaw, parseModuleGridDirectiveYaml } from '@/lib/docs/source/module-group-config';

describe('parseModuleGridDirectiveYaml', () => {
  it('defaults layout to tabs when omitted', () => {
    const result = parseModuleGridDirectiveYaml(
      { item: { label: '商品/Item' } },
      'test.md',
    );
    assert.equal(result.layout, 'tabs');
    assert.equal(result.groups.item?.label, '商品/Item');
  });

  it('extracts layout and keeps groups separate', () => {
    const result = parseModuleGridDirectiveYaml(
      {
        layout: 'stack',
        taobao: { label: '淘宝 / 天猫' },
        pinduoduo: { label: '拼多多' },
      },
      'test.md',
    );
    assert.equal(result.layout, 'stack');
    assert.equal(result.cover, false);
    assert.deepEqual(Object.keys(result.groups), ['taobao', 'pinduoduo']);
    assert.equal(result.groups.taobao?.label, '淘宝 / 天猫');
    assert.equal('layout' in result.groups, false);
  });

  it('extracts cover and defaults to false', () => {
    const off = parseModuleGridDirectiveYaml(
      { cover: false, item: { label: '商品/Item' } },
      'test.md',
    );
    assert.equal(off.cover, false);

    const on = parseModuleGridDirectiveYaml(
      { cover: true, item: { label: '商品/Item' } },
      'test.md',
    );
    assert.equal(on.cover, true);
    assert.equal('cover' in on.groups, false);
  });

  it('throws on invalid cover', () => {
    assert.throws(
      () => parseModuleGridDirectiveYaml({ cover: 'yes' }, 'test.md'),
      /cover must be true or false/,
    );
  });

  it('throws on invalid layout', () => {
    assert.throws(
      () =>
        parseModuleGridDirectiveYaml({ layout: 'grid' }, 'test.md'),
      /layout must be "tabs" or "stack"/,
    );
  });

  it('accepts icon string shorthand and object with color', () => {
    const shorthand = parseModuleGridDirectiveYaml(
      { shop: { label: '店铺/Shop', icon: 'Store' } },
      'test.md',
    );
    assert.deepEqual(shorthand.groups.shop?.icon, { comp: 'Store' });

    const colored = parseModuleGridDirectiveYaml(
      {
        item: {
          label: '商品/Item',
          icon: { comp: 'ShoppingBag', color: '#ea580c' },
        },
      },
      'test.md',
    );
    assert.deepEqual(colored.groups.item?.icon, {
      comp: 'ShoppingBag',
      color: '#ea580c',
    });
  });
});

describe('parseModuleGridBlockFromRaw', () => {
  it('parses the first module-grid block from raw markdown', () => {
    const raw = `---
title: RPA 连接器
---

:::module-grid
layout: stack
taobao:
  label: 淘宝 / 天猫
:::

Body text
`;
    const result = parseModuleGridBlockFromRaw(raw, 'connectors/index.md');
    assert.ok(result);
    assert.equal(result!.layout, 'stack');
    assert.equal(result!.groups.taobao?.label, '淘宝 / 天猫');
  });

  it('returns null when block is missing', () => {
    assert.equal(parseModuleGridBlockFromRaw('# Hello', 'test.md'), null);
  });
});
