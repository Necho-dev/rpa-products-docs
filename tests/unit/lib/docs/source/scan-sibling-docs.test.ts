import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  parseMetaPanelPlatformUrl,
  resolveCategoryFilterTabGroups,
  scanCatalogPackageIndexModulesSync,
  stripTocOnlyHeadings,
} from '@/lib/docs/source/scan-sibling-docs';

describe('stripTocOnlyHeadings', () => {
  it('removes virtual category-filter toc headings', () => {
    const input = `## 内含连接器 [#内含连接器]

### 商品/Item [toc] [#内含连接器-item]

### 店铺/Shop \\[toc] [#内含连接器-shop]

:::category-filter
layout: tabs
depth: 1
:::`;

    const output = stripTocOnlyHeadings(input);

    assert.doesNotMatch(output, /\[toc\]/);
    assert.match(output, /## 内含连接器/);
    assert.match(output, /:::category-filter/);
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
    const indexPath = path.join(process.cwd(), 'content/docs/rpa/index.mdx');
    const modules = scanCatalogPackageIndexModulesSync(indexPath);

    assert.ok(modules.length >= 6);
    assert.ok(modules.some((m) => m.slug === 'RPA_QIANNIU'));
    assert.ok(modules.some((m) => m.group === 'taobao'));
  });
});

describe('resolveCategoryFilterTabGroups', () => {
  it('uses categoryAxis.items when the catalog exists', () => {
    const indexPath = path.join(
      process.cwd(),
      'content/docs/rpa/RPA_QIANNIU/index.md',
    );
    const groups = resolveCategoryFilterTabGroups(indexPath, [
      'rpa',
      'RPA_QIANNIU',
    ]);
    assert.deepEqual(
      groups.map((g) => g.key),
      ['item', 'shop', 'logistics', 'marketing', 'finance'],
    );
  });

  it('falls back to child folder slugs when catalog items are empty', () => {
    const indexPath = path.join(
      process.cwd(),
      'content/docs/rpa/RPA_ALIMM/index.md',
    );
    const groups = resolveCategoryFilterTabGroups(indexPath, ['rpa', 'RPA_ALIMM']);
    assert.deepEqual(
      groups.map((g) => g.key),
      ['DMP', 'PPXX', 'PXB', 'TBLM', 'UD', 'WXT', 'YXSTUD'],
    );
    assert.equal(groups.find((g) => g.key === 'DMP')?.label, '达摩盘');
    assert.equal(groups.find((g) => g.key === 'WXT')?.label, '万相台');
  });

  it('keeps a single catalog item (e.g. YXSTUD 业务场景)', () => {
    const indexPath = path.join(
      process.cwd(),
      'content/docs/rpa/RPA_ALIMM/YXSTUD/index.md',
    );
    const groups = resolveCategoryFilterTabGroups(indexPath, [
      'rpa',
      'RPA_ALIMM',
      'YXSTUD',
    ]);
    assert.deepEqual(groups, [
      { key: 'smart', label: 'UDSmart 报表' },
    ]);
  });
});
