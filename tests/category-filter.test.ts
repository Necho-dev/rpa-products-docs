import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isWithinCategoryFilterDepth,
  parseCategoryFilterBlockFromRaw,
  parseCategoryFilterDirectiveYaml,
} from '../src/lib/docs/source/category-filter-config';
import {
  buildAxisFacet,
  buildFirstAxisFacet,
  planFacetRows,
} from '../src/lib/docs/source/category-filter-facet';
import type { CategoryFilterItem } from '../src/lib/docs/source/category-filter-types';
import {
  buildPageTokens,
  pageCount,
} from '../src/lib/docs/source/category-filter-pagination';
import { selectedSlugFromCategoryFilterHash } from '../src/lib/docs/source/category-filter-hash';

describe('category-filter-config', () => {
  it('defaults cover false and search true', () => {
    assert.deepEqual(parseCategoryFilterDirectiveYaml(null, 'x.md'), {
      cover: false,
      search: true,
      labels: true,
      pagination: { enable: false, size: 12, style: 'button' },
    });
  });

  it('parses layout from a category-filter markdown block', () => {
    const parsed = parseCategoryFilterBlockFromRaw(
      [':::category-filter', 'cover: false', 'layout: stack', 'depth: 1', ':::'].join(
        '\n',
      ),
      'x.md',
    );
    assert.equal(parsed?.layout, 'stack');
    assert.equal(parsed?.depth, 1);
    assert.equal(parsed?.cover, false);
  });

  it('parses cover, search, depth and layout', () => {
    assert.deepEqual(
      parseCategoryFilterDirectiveYaml(
        {
          cover: true,
          search: false,
          depth: 1,
          layout: 'tabs',
        },
        'x.md',
      ),
      {
        cover: true,
        search: false,
        depth: 1,
        layout: 'tabs',
        labels: true,
        pagination: { enable: false, size: 12, style: 'button' },
      },
    );
  });

  it('rejects removed collect field', () => {
    assert.throws(
      () => parseCategoryFilterDirectiveYaml({ collect: 'children' }, 'x.md'),
      /collect is removed/,
    );
  });

  it('rejects invalid search', () => {
    assert.throws(
      () => parseCategoryFilterDirectiveYaml({ search: 'yes' }, 'x.md'),
      /search must be true or false/,
    );
  });

  it('parses layout table and defaults cover on', () => {
    assert.deepEqual(
      parseCategoryFilterDirectiveYaml({ layout: 'table', depth: 1 }, 'x.md'),
      {
        cover: true,
        search: true,
        depth: 1,
        layout: 'table',
        labels: true,
        pagination: { enable: false, size: 12, style: 'button' },
      },
    );
  });

  it('keeps explicit cover false with layout table', () => {
    assert.equal(
      parseCategoryFilterDirectiveYaml({ layout: 'table', cover: false }, 'x.md')
        .cover,
      false,
    );
  });

  it('rejects invalid layout', () => {
    assert.throws(
      () => parseCategoryFilterDirectiveYaml({ layout: 'chips' }, 'x.md'),
      /layout must be "tabs", "stack", "flat", or "table"/,
    );
  });

  it('rejects invalid depth', () => {
    assert.throws(
      () => parseCategoryFilterDirectiveYaml({ depth: 0 }, 'x.md'),
      /depth must be an integer >= 1/,
    );
  });

  it('parses labels false', () => {
    assert.equal(
      parseCategoryFilterDirectiveYaml({ labels: false }, 'x.md').labels,
      false,
    );
  });

  it('parses hubs true', () => {
    assert.equal(
      parseCategoryFilterDirectiveYaml({ hubs: true, depth: 1 }, 'x.md').hubs,
      true,
    );
  });

  it('rejects invalid hubs', () => {
    assert.throws(
      () => parseCategoryFilterDirectiveYaml({ hubs: 'yes' }, 'x.md'),
      /hubs must be true or false/,
    );
  });

  it('parses pagination object and boolean shorthand', () => {
    assert.deepEqual(
      parseCategoryFilterDirectiveYaml(
        {
          pagination: { enable: true, size: 8, style: 'link' },
        },
        'x.md',
      ).pagination,
      { enable: true, size: 8, style: 'link' },
    );
    assert.equal(
      parseCategoryFilterDirectiveYaml({ pagination: true }, 'x.md').pagination
        .enable,
      true,
    );
  });

  it('rejects invalid pagination', () => {
    assert.throws(
      () => parseCategoryFilterDirectiveYaml({ pagination: { size: 0 } }, 'x.md'),
      /pagination.size/,
    );
    assert.throws(
      () =>
        parseCategoryFilterDirectiveYaml({ pagination: { style: 'pill' } }, 'x.md'),
      /pagination.style/,
    );
  });
});

describe('isWithinCategoryFilterDepth', () => {
  const prefix = ['rpa', 'RPA_ALIMM'];

  it('treats the connector filename as depth 1', () => {
    assert.equal(
      isWithinCategoryFilterDepth(
        ['rpa', 'RPA_ALIMM', 'rpa-conn-x'],
        prefix,
        1,
      ),
      true,
    );
  });

  it('includes nested folder leaves at depth 2 and excludes them at depth 1', () => {
    const nested = ['rpa', 'RPA_ALIMM', 'DMP', 'rpa-conn-x'];
    assert.equal(isWithinCategoryFilterDepth(nested, prefix, 1), false);
    assert.equal(isWithinCategoryFilterDepth(nested, prefix, 2), true);
  });

  it('does not cap when depth is omitted', () => {
    assert.equal(
      isWithinCategoryFilterDepth(
        ['rpa', 'RPA_ALIMM', 'A', 'B', 'rpa-conn-x'],
        prefix,
      ),
      true,
    );
  });
});

describe('buildFirstAxisFacet', () => {
  it('groups by first folder segment and keeps meta order', () => {
    const items: CategoryFilterItem[] = [
      {
        href: '/a',
        title: 'A',
        folderPath: [
          { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
        ],
      },
      {
        href: '/b',
        title: 'B',
        folderPath: [
          { slug: 'WXT', axisTitle: '子平台', item: '万相台' },
        ],
      },
      {
        href: '/c',
        title: 'C',
        folderPath: [
          { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
        ],
      },
    ];
    const facet = buildFirstAxisFacet(items, ['DMP', 'PPXX', 'WXT']);
    assert.equal(facet?.axisTitle, '子平台');
    assert.deepEqual(
      facet?.options.map((o) => [o.slug, o.count, o.item]),
      [
        ['DMP', 2, '达摩盘'],
        ['WXT', 1, '万相台'],
      ],
    );
  });
});

describe('buildAxisFacet', () => {
  it('groups second axis from virtual leaf segments', () => {
    const items: CategoryFilterItem[] = [
      {
        href: '/a',
        title: 'A',
        folderPath: [
          { slug: 'PPXX', axisTitle: '子平台', item: '品牌新享' },
          { slug: 'crowd', axisTitle: '业务场景', item: '超级新品孵化' },
        ],
      },
      {
        href: '/b',
        title: 'B',
        folderPath: [
          { slug: 'PPXX', axisTitle: '子平台', item: '品牌新享' },
          { slug: 'tyroacc', axisTitle: '业务场景', item: '超级新客加速' },
        ],
      },
      {
        href: '/c',
        title: 'C',
        folderPath: [
          { slug: 'PPXX', axisTitle: '子平台', item: '品牌新享' },
          { slug: 'crowd', axisTitle: '业务场景', item: '超级新品孵化' },
        ],
      },
    ];
    const facet = buildAxisFacet(items, 1, ['crowd', 'memacc', 'tyroacc']);
    assert.equal(facet?.axisTitle, '业务场景');
    assert.deepEqual(
      facet?.options.map((o) => [o.item, o.count]),
      [
        ['超级新品孵化', 2],
        ['超级新客加速', 1],
      ],
    );
  });

  it('branchingOnly drops leaf platform chips', () => {
    const rows: CategoryFilterItem[] = [
      {
        href: '/dmp',
        title: '达摩盘',
        folderPath: [
          { slug: 'RPA_ALIMM', axisTitle: '平台', item: '阿里妈妈' },
          { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
        ],
      },
      {
        href: '/qn',
        title: '千牛',
        folderPath: [
          { slug: 'RPA_QIANNIU', axisTitle: '平台', item: '千牛商家工作台' },
        ],
      },
    ];
    const facet = buildAxisFacet(rows, 0, ['RPA_QIANNIU', 'RPA_ALIMM'], {
      branchingOnly: true,
    });
    assert.deepEqual(
      facet?.options.map((o) => o.item),
      ['阿里妈妈'],
    );
  });
});

describe('planFacetRows', () => {
  const items: CategoryFilterItem[] = [
    {
      href: '/dmp',
      title: '达摩盘',
      folderPath: [
        { slug: 'taobao', axisTitle: '生态', item: '淘系' },
        { slug: 'RPA_ALIMM', axisTitle: '平台', item: '阿里妈妈' },
        { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
      ],
    },
    {
      href: '/qn',
      title: '千牛',
      folderPath: [
        { slug: 'taobao', axisTitle: '生态', item: '淘系' },
        { slug: 'RPA_QIANNIU', axisTitle: '平台', item: '千牛商家工作台' },
      ],
    },
    {
      href: '/qc',
      title: '巨量千川',
      folderPath: [
        { slug: 'doudian', axisTitle: '生态', item: '抖店' },
        { slug: 'RPA_JULIANG', axisTitle: '平台', item: '巨量引擎' },
        { slug: 'QC', axisTitle: '子平台', item: '巨量千川' },
      ],
    },
  ];
  const facet = buildFirstAxisFacet(items, ['taobao', 'doudian']);

  it('first axis is 生态 from folder path', () => {
    assert.equal(facet?.axisTitle, '生态');
    assert.deepEqual(
      facet?.options.map((o) => o.slug),
      ['taobao', 'doudian'],
    );
  });

  it('shows all 平台 chips including leaf hubs and omits 1:1 子平台', () => {
    const withSiblings: CategoryFilterItem[] = [
      ...items,
      {
        href: '/pxb',
        title: '品销宝',
        folderPath: [
          { slug: 'taobao', axisTitle: '生态', item: '淘系' },
          { slug: 'RPA_ALIMM', axisTitle: '平台', item: '阿里妈妈' },
          { slug: 'PXB', axisTitle: '子平台', item: '品销宝' },
        ],
      },
      {
        href: '/yt',
        title: '巨量云图',
        folderPath: [
          { slug: 'doudian', axisTitle: '生态', item: '抖店' },
          { slug: 'RPA_JULIANG', axisTitle: '平台', item: '巨量引擎' },
          { slug: 'YT', axisTitle: '子平台', item: '巨量云图' },
        ],
      },
    ];
    const rows = planFacetRows({
      items: withSiblings,
      facet: buildFirstAxisFacet(withSiblings, ['taobao', 'doudian']),
      childOrders: {
        taobao: ['RPA_QIANNIU', 'RPA_ALIMM'],
        doudian: ['RPA_JULIANG'],
      },
      selected: [],
      maxDepth: 3,
    });
    assert.deepEqual(
      rows.map((r) => r.axisTitle),
      ['生态', '平台'],
    );
    assert.deepEqual(
      rows[1]?.facet?.options.map((o) => o.item),
      ['千牛商家工作台', '阿里妈妈', '巨量引擎'],
    );
  });

  it('uses childOrders[""] for 平台 when 生态 is 全部', () => {
    const rows = planFacetRows({
      items,
      facet,
      childOrders: {
        '': ['RPA_QIANNIU', 'RPA_JULIANG', 'RPA_ALIMM'],
        taobao: ['RPA_ALIMM', 'RPA_QIANNIU'],
        doudian: ['RPA_JULIANG'],
      },
      selected: [],
      maxDepth: 3,
    });
    assert.deepEqual(
      rows[1]?.facet?.options.map((o) => o.slug),
      ['RPA_QIANNIU', 'RPA_JULIANG', 'RPA_ALIMM'],
    );
  });

  it('keeps 业务场景 chips on platform hubs even when each scene has one card', () => {
    const alimm: CategoryFilterItem[] = [
      {
        href: '/insight',
        title: '货品洞察',
        folderPath: [
          { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
          { slug: 'insight', axisTitle: '业务场景', item: '货品洞察' },
        ],
      },
      {
        href: '/compete',
        title: '竞争态势',
        folderPath: [
          { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
          { slug: 'compete', axisTitle: '业务场景', item: '竞争态势' },
        ],
      },
      {
        href: '/szyx',
        title: '账户中心',
        folderPath: [
          { slug: 'SZYX', axisTitle: '子平台', item: '数字营销' },
          { slug: 'szyx', axisTitle: '业务场景', item: '账户中心' },
        ],
      },
    ];
    const rows = planFacetRows({
      items: alimm,
      facet: buildFirstAxisFacet(alimm, ['DMP', 'SZYX']),
      childOrders: {
        DMP: ['insight', 'compete'],
        SZYX: ['szyx'],
      },
      selected: [],
      maxDepth: 2,
    });
    assert.deepEqual(
      rows.map((r) => r.axisTitle),
      ['子平台', '业务场景'],
    );
    assert.deepEqual(
      rows[1]?.facet?.options.map((o) => o.item),
      ['货品洞察', '竞争态势', '账户中心'],
    );
  });

  it('keeps 子平台 and 业务场景 chips in sidebar folder order, not localeCompare', () => {
    const items: CategoryFilterItem[] = [
      {
        href: '/gys',
        title: '结算销售',
        folderPath: [
          { slug: 'GYS', axisTitle: '子平台', item: '供应商' },
          { slug: 'gys', axisTitle: '业务场景', item: '结算销售' },
        ],
      },
      {
        href: '/yx',
        title: '营销',
        folderPath: [
          { slug: 'YX', axisTitle: '子平台', item: '营销平台' },
          { slug: 'yx', axisTitle: '业务场景', item: '营销' },
        ],
      },
      {
        href: '/finance',
        title: '财务',
        folderPath: [
          { slug: 'YX', axisTitle: '子平台', item: '营销平台' },
          { slug: 'finance', axisTitle: '业务场景', item: '财务' },
        ],
      },
    ];
    const rows = planFacetRows({
      items,
      facet: buildFirstAxisFacet(items, ['YX', 'GYS']),
      childOrders: {
        GYS: ['gys'],
        YX: ['yx', 'finance'],
      },
      selected: [],
      maxDepth: 2,
    });
    assert.deepEqual(
      rows[0]?.facet?.options.map((o) => o.item),
      ['营销平台', '供应商'],
    );
    assert.deepEqual(
      rows[1]?.facet?.options.map((o) => o.item),
      ['营销', '财务', '结算销售'],
    );
  });

  it('still shows leaf 平台 when selected 生态 has no nested hubs', () => {
    const pdd: CategoryFilterItem[] = [
      {
        href: '/pdd',
        title: '拼多多商家后台',
        folderPath: [
          { slug: 'pinduoduo', axisTitle: '生态', item: '拼多多' },
          { slug: 'RPA_PINDUODUO', axisTitle: '平台', item: '拼多多商家后台' },
        ],
      },
      ...items,
    ];
    const rows = planFacetRows({
      items: pdd,
      facet: buildFirstAxisFacet(pdd, ['taobao', 'pinduoduo', 'doudian']),
      childOrders: { taobao: ['RPA_ALIMM'], pinduoduo: ['RPA_PINDUODUO'] },
      selected: ['pinduoduo'],
      maxDepth: 3,
    });
    assert.equal(rows[0]?.axisTitle, '生态');
    assert.equal(rows[1]?.axisTitle, '平台');
    assert.deepEqual(
      rows[1]?.facet?.options.map((o) => o.item),
      ['拼多多商家后台'],
    );
  });
});

describe('category-filter pagination tokens', () => {
  it('lists every page when total is small', () => {
    assert.deepEqual(buildPageTokens(1, 5), [1, 2, 3, 4, 5]);
  });

  it('keeps first last and a window around current', () => {
    assert.deepEqual(buildPageTokens(5, 50), [
      1,
      'ellipsis',
      3,
      4,
      5,
      6,
      7,
      'ellipsis',
      50,
    ]);
  });

  it('counts pages', () => {
    assert.equal(pageCount(27, 12), 3);
    assert.equal(pageCount(0, 12), 0);
  });
});

describe('category-filter hash → first axis', () => {
  const anchors = [
    { key: 'DMP', anchorId: '连接器-DMP' },
    { key: 'PXB', anchorId: '连接器-PXB' },
  ];

  it('selects the matching facet slug', () => {
    assert.deepEqual(
      selectedSlugFromCategoryFilterHash('#连接器-DMP', anchors, '连接器'),
      { kind: 'slug', slug: 'DMP' },
    );
  });

  it('treats the parent heading as all', () => {
    assert.deepEqual(
      selectedSlugFromCategoryFilterHash('#连接器', anchors, '连接器'),
      { kind: 'all' },
    );
  });

  it('ignores unrelated hashes', () => {
    assert.deepEqual(
      selectedSlugFromCategoryFilterHash('#附录', anchors, '连接器'),
      { kind: 'ignore' },
    );
  });
});
