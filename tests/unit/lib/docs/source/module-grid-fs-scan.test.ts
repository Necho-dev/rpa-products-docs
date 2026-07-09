import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  collectModuleGridGroupsFromScan,
  formatModuleGridDirectiveWithModules,
  parseMetaPanelPlatformUrl,
  scanCatalogPackageIndexModulesSync,
  scanModuleGridModulesSync,
  stripTocOnlyHeadings,
} from '@/lib/docs/source/module-grid-fs-scan';

describe('collectModuleGridGroupsFromScan', () => {
  it('filters empty groups when used with filter', () => {
    const result = collectModuleGridGroupsFromScan(
      [
        {
          slug: 'rpa-conn-qianniu-item-a',
          title: 'A',
          entry: 'rpa.conn.qianniu.item.a',
        },
      ],
      { item: { label: '商品/Item' }, shop: { label: '店铺/Shop' } },
    ).filter((g) => g.modules.length > 0);

    assert.deepEqual(result.map((g) => g.key), ['item']);
  });
});

describe('formatModuleGridDirectiveWithModules', () => {
  it('embeds modules under each group in module-grid YAML', () => {
    const md = formatModuleGridDirectiveWithModules(
      {
        item: { label: '商品/Item', icon: { comp: 'ShoppingBag' } },
        shop: { label: '店铺/Shop', icon: { comp: 'Store' } },
      },
      [
        {
          key: 'item',
          label: '商品/Item',
          icon: { comp: 'ShoppingBag' },
          modules: [
            {
              title: '商品 A',
              href: './rpa-conn-qianniu-item-a',
              code: 'rpa.conn.qianniu.item.a',
            },
          ],
        },
        {
          key: 'shop',
          label: '店铺/Shop',
          icon: { comp: 'Store' },
          modules: [
            {
              title: '店铺 B',
              href: './rpa-conn-qianniu-shop-b',
              code: 'rpa.conn.qianniu.shop.b',
            },
          ],
        },
      ],
    );

    assert.match(md, /^:::module-grid\n/);
    assert.match(md, /\n:::\n?$/);
    assert.match(md, /item:\n/);
    assert.match(md, /  label: 商品\/Item/);
    assert.match(md, /  icon: ShoppingBag/);
    assert.match(md, /  modules:/);
    assert.match(md, /    - title: 商品 A/);
    assert.match(md, /      slug: rpa-conn-qianniu-item-a/);
    assert.match(md, /      entry: rpa\.conn\.qianniu\.item\.a/);
    assert.match(md, /shop:\n/);
    assert.doesNotMatch(md, /模块清单/);
  });

  it('returns empty string when no modules', () => {
    assert.equal(formatModuleGridDirectiveWithModules({}, []), '');
  });

  it('preserves stack layout in exported YAML', () => {
    const md = formatModuleGridDirectiveWithModules(
      { taobao: { label: '淘宝 / 天猫' } },
      [
        {
          key: 'taobao',
          label: '淘宝 / 天猫',
          modules: [
            {
              title: '千牛',
              href: './RPA_QIANNIU',
              code: 'RPA_QIANNIU',
            },
          ],
        },
      ],
      'stack',
    );

    assert.match(md, /layout: stack/);
    assert.match(md, /taobao:/);
  });
});

describe('stripTocOnlyHeadings', () => {
  it('removes virtual module-grid toc headings', () => {
    const input = `## 内含连接器 [#内含连接器]

### 商品/Item [toc] [#内含连接器-item]

### 店铺/Shop \\[toc] [#内含连接器-shop]

:::module-grid
item:
  label: 商品/Item
:::`;

    const output = stripTocOnlyHeadings(input);

    assert.doesNotMatch(output, /\[toc\]/);
    assert.match(output, /## 内含连接器/);
    assert.match(output, /:::module-grid/);
  });

  it('collapses excessive blank lines', () => {
    const input = '## A\n\n\n\n## B';
    assert.equal(stripTocOnlyHeadings(input), '## A\n\n## B');
  });
});

describe('parseMetaPanelPlatformUrl', () => {
  it('reads platformUrl from meta-panel block', () => {
    const content = `---
title: Test
---

:::meta-panel
platform: 千牛
platformUrl: https://myseller.taobao.com
requireLogin: true
:::

## Body
`;
    assert.equal(
      parseMetaPanelPlatformUrl(content),
      'https://myseller.taobao.com',
    );
  });

  it('returns undefined when meta-panel is missing', () => {
    assert.equal(parseMetaPanelPlatformUrl('# Hello'), undefined);
  });
});

describe('scanCatalogPackageIndexModulesSync', () => {
  it('reads package index pages from subdirectories', () => {
    const indexPath = path.join(
      process.cwd(),
      'content/docs/index.mdx',
    );
    const modules = scanCatalogPackageIndexModulesSync(indexPath);

    assert.ok(modules.length >= 6);
    assert.ok(modules.some((m) => m.slug === 'RPA_QIANNIU'));
    assert.ok(modules.some((m) => m.moduleGroup === 'taobao'));
  });
});

describe('scanModuleGridModulesSync', () => {
  it('falls back to catalog scan when flat siblings are empty', () => {
    const indexPath = path.join(
      process.cwd(),
      'content/docs/index.mdx',
    );
    const modules = scanModuleGridModulesSync(indexPath);

    assert.ok(modules.length >= 6);
  });
});
