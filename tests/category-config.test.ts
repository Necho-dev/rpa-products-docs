import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendLeafCategorySegment,
  buildFolderPath,
  folderSlugsBetween,
  isHubSlug,
  isDocsFolderIndexPath,
  readCategory,
  readCategoryAxis,
  readMetaCategoryAxis,
  readLeafCategoryKey,
  readLeafCategoryIcon,
  resolveFolderSegment,
  slugsStartWith,
  hasChildHubSlug,
  buildHubFolderPath,
  folderPathBreadcrumb,
} from '../src/lib/docs/source/category-config';
import {
  compareDocsSidebarOrder,
  readDocsIndexFrontmatter,
  readDocsMetaJson,
} from '../src/lib/docs/source/meta-pages-order';

describe('category-config', () => {
  it('reads page category item/icon', () => {
    const c = readCategory({
      item: '达摩盘',
      icon: 'ICO_ALIMM_DMP',
    });
    assert.deepEqual(c, {
      item: '达摩盘',
      icon: { comp: 'ICO_ALIMM_DMP' },
    });
  });

  it('reads categoryAxis catalog with string icons', () => {
    const c = readCategoryAxis({
      title: '业务场景',
      items: [
        { key: 'crowd', item: '超级新品孵化', icon: 'Sparkles' },
        { key: 'old', item: '超级老客加速' },
      ],
    });
    assert.equal(c.title, '业务场景');
    assert.equal(c.items?.length, 2);
    assert.equal(c.items?.[0]?.icon?.comp, 'Sparkles');
  });

  it('reads categoryAxis catalog with colored Lucide icons', () => {
    const c = readCategoryAxis({
      title: '业务场景',
      items: [
        {
          key: 'crowd',
          item: '超级新品孵化',
          icon: { comp: 'Sparkles', color: '#eab308' },
        },
      ],
    });
    assert.deepEqual(c.items?.[0]?.icon, { comp: 'Sparkles', color: '#eab308' });
  });

  it('reads leaf category string as slug', () => {
    assert.deepEqual(readCategory('crowd'), { slug: 'crowd' });
    assert.equal(readLeafCategoryKey('crowd'), 'crowd');
    assert.equal(readLeafCategoryKey({ slug: 'crowd' }), 'crowd');
    assert.equal(
      readLeafCategoryKey({ slug: 'crowd', icon: { comp: 'Sparkles' } }),
      'crowd',
    );
  });

  it('reads leaf category.icon from object form', () => {
    assert.equal(readLeafCategoryIcon('crowd'), undefined);
    assert.deepEqual(
      readLeafCategoryIcon({
        slug: 'crowd',
        icon: { comp: 'Sparkles', color: '#eab308' },
      }),
      { comp: 'Sparkles', color: '#eab308' },
    );
  });

  it('reads category.link as platform url', () => {
    assert.equal(
      readCategory({
        slug: 'taobao',
        link: 'https://myseller.taobao.com',
      }).link,
      'https://myseller.taobao.com',
    );
  });

  it('detects hub slugs when descendants exist', () => {
    const all = [
      ['rpa', 'RPA_ALIMM'],
      ['rpa', 'RPA_ALIMM', 'DMP'],
      ['rpa', 'RPA_ALIMM', 'DMP', 'rpa-conn-alimm-dmp-compete-situation-item'],
    ];
    assert.equal(isHubSlug(['rpa', 'RPA_ALIMM'], all), true);
    assert.equal(isHubSlug(['rpa', 'RPA_ALIMM', 'DMP'], all), true);
    assert.equal(
      isHubSlug(
        ['rpa', 'RPA_ALIMM', 'DMP', 'rpa-conn-alimm-dmp-compete-situation-item'],
        all,
      ),
      false,
    );
  });

  it('treats empty package index.md as a folder index', () => {
    assert.equal(
      isDocsFolderIndexPath('rpa/RPA_1688/SJGZT/index.md'),
      true,
    );
    assert.equal(
      isDocsFolderIndexPath(
        'rpa/RPA_1688/SZYX/rpa-conn-1688-szyx-account-center-detail.md',
      ),
      false,
    );
  });

  it('builds folder path with axis from parent category.title', () => {
    const prefix = ['rpa', 'RPA_ALIMM'];
    const page = [
      'rpa',
      'RPA_ALIMM',
      'DMP',
      'rpa-conn-alimm-dmp-compete-situation-item',
    ];
    assert.deepEqual(folderSlugsBetween(prefix, page), ['DMP']);
    assert.equal(slugsStartWith(page, prefix), true);

    const path = buildFolderPath(prefix, page, (slugs) => {
      if (slugs.join('/') === 'rpa/RPA_ALIMM') {
        return { axis: { title: '子平台' }, title: '阿里妈妈' };
      }
      if (slugs.join('/') === 'rpa/RPA_ALIMM/DMP') {
        return { title: '达摩盘', icon: 'ICO_ALIMM_DMP' };
      }
      return undefined;
    });
    assert.equal(path.length, 1);
    assert.equal(path[0]?.axisTitle, '子平台');
    assert.equal(path[0]?.item, '达摩盘');
    assert.equal(path[0]?.icon?.comp, 'ICO_ALIMM_DMP');
  });

  it('prefers category.item over title', () => {
    const seg = resolveFolderSegment('DMP', { axis: { title: '子平台' } }, {
      category: { item: '达摩盘/DMP' },
      title: '达摩盘',
    });
    assert.equal(seg.item, '达摩盘/DMP');
    assert.equal(seg.axisTitle, '子平台');
  });

  it('appends virtual leaf segment from parent catalog', () => {
    const path = appendLeafCategorySegment(
      [{ slug: 'PPXX', axisTitle: '子平台', item: '品牌新享' }],
      {
        axis: {
          title: '业务场景',
          items: [
            { key: 'crowd', item: '超级新品孵化', icon: { comp: 'Sparkles' } },
          ],
        },
        title: '品牌新享',
      },
      'crowd',
    );
    assert.equal(path.length, 2);
    assert.equal(path[1]?.slug, 'crowd');
    assert.equal(path[1]?.axisTitle, '业务场景');
    assert.equal(path[1]?.item, '超级新品孵化');
    assert.equal(path[1]?.icon?.comp, 'Sparkles');
  });

  it('uses page title when catalog has no matching item', () => {
    const path = appendLeafCategorySegment(
      [],
      { axis: { title: '子平台' }, title: '1688' },
      'sjgzt',
      '商家工作台',
    );
    assert.equal(path.length, 1);
    assert.equal(path[0]?.slug, 'sjgzt');
    assert.equal(path[0]?.item, '商家工作台');
  });

  it('skips virtual segment without leaf key', () => {
    const path = appendLeafCategorySegment(
      [{ slug: 'DMP', axisTitle: '子平台', item: '达摩盘' }],
      { axis: { title: '业务场景' } },
      undefined,
    );
    assert.equal(path.length, 1);
  });

  it('detects child hub indexes but not connector files', () => {
    const all = [
      ['rpa', 'RPA_ALIMM'],
      ['rpa', 'RPA_ALIMM', 'DMP'],
      ['rpa', 'RPA_ALIMM', 'DMP', 'rpa-conn-x'],
      ['rpa', 'RPA_QIANNIU'],
      ['rpa', 'RPA_QIANNIU', 'rpa-conn-y'],
    ];
    assert.equal(hasChildHubSlug(['rpa', 'RPA_ALIMM'], all), true);
    assert.equal(hasChildHubSlug(['rpa', 'RPA_QIANNIU'], all), false);
    assert.equal(hasChildHubSlug(['rpa', 'RPA_ALIMM', 'DMP'], all), false);
  });

  it('builds hub path 生态 → 平台 → 子平台', () => {
    const path = buildHubFolderPath(
      ['rpa'],
      ['rpa', 'RPA_ALIMM', 'DMP'],
      (slugs) => {
        const key = slugs.join('/');
        if (key === 'rpa') {
          return {
            axis: {
              title: '生态',
              items: [{ key: 'taobao', item: '淘系' }],
            },
          };
        }
        if (key === 'rpa/RPA_ALIMM') {
          return {
            title: '阿里妈妈',
            category: { slug: 'taobao' },
            axis: { title: '子平台' },
          };
        }
        if (key === 'rpa/RPA_ALIMM/DMP') {
          return {
            title: '达摩盘',
            category: { icon: { comp: 'ICO_ALIMM_DMP' } },
          };
        }
        return undefined;
      },
    );
    assert.equal(path.length, 3);
    assert.equal(path[0]?.item, '淘系');
    assert.equal(path[1]?.axisTitle, '平台');
    assert.equal(path[1]?.item, '阿里妈妈');
    assert.equal(path[2]?.axisTitle, '子平台');
    assert.equal(path[2]?.item, '达摩盘');
    assert.equal(path[2]?.icon?.comp, 'ICO_ALIMM_DMP');
  });

  it('leaf hub folder path is 生态 → 平台', () => {
    const path = buildHubFolderPath(['rpa'], ['rpa', 'RPA_QIANNIU'], (slugs) => {
      const key = slugs.join('/');
      if (key === 'rpa') {
        return {
          axis: {
            title: '生态',
            items: [{ key: 'taobao', item: '淘系' }],
          },
        };
      }
      if (key === 'rpa/RPA_QIANNIU') {
        return { title: '千牛商家工作台', category: { slug: 'taobao' } };
      }
      return undefined;
    });
    assert.equal(path.length, 2);
    assert.equal(path[0]?.axisTitle, '生态');
    assert.equal(path[0]?.item, '淘系');
    assert.equal(path[1]?.axisTitle, '平台');
    assert.equal(path[1]?.item, '千牛商家工作台');
  });

  it('reads 生态 catalog and hub slug from disk', () => {
    const root = readMetaCategoryAxis(readDocsMetaJson('rpa'));
    assert.equal(root.title, '生态');
    assert.ok(root.items?.some((row) => row.key === 'taobao' && row.item === '淘系'));
    const alimm = readCategory(readDocsIndexFrontmatter('rpa/RPA_ALIMM')?.category);
    assert.equal(alimm.slug, 'taobao');
  });

  it('breadcrumb drops leaf title and skips empty path', () => {
    assert.equal(
      folderPathBreadcrumb(
        [
          { slug: 'taobao', axisTitle: '生态', item: '淘系' },
          { slug: 'RPA_ALIMM', axisTitle: '平台', item: '阿里妈妈' },
          { slug: 'DMP', axisTitle: '子平台', item: '达摩盘' },
        ],
        '达摩盘',
      ),
      '淘系 › 阿里妈妈',
    );
    assert.equal(
      folderPathBreadcrumb(
        [{ slug: 'item', axisTitle: '业务场景', item: '商品' }],
        '商品-发布-类目属性模板提取',
      ),
      '商品',
    );
    assert.equal(
      folderPathBreadcrumb(
        [{ slug: 'dmp', axisTitle: '子平台', item: '达摩盘' }],
        '达摩盘',
      ),
      undefined,
    );
    assert.equal(folderPathBreadcrumb([], '千牛'), undefined);
  });

  it('sidebar order follows rpa meta.json pages', () => {
    assert.ok(
      compareDocsSidebarOrder(
        ['rpa', 'RPA_QIANNIU'],
        ['rpa', 'RPA_ALIMM', 'DMP'],
        ['rpa'],
      ) < 0,
    );
    assert.ok(
      compareDocsSidebarOrder(
        ['rpa', 'RPA_ALIMM', 'DMP'],
        ['rpa', 'RPA_ALIMM', 'PPXX'],
        ['rpa'],
      ) < 0,
    );
  });
});
