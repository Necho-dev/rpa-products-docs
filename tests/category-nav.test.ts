import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  categoryNavHref,
  inferredCategoryNavKey,
  matchCategoryNavModel,
  readCategoryNav,
  resolveCategoryNavSelection,
  sidebarNodePassesCategoryNav,
  withCategoryNavQuery,
} from '../src/lib/docs/source/category-nav';
import {
  buildCategoryNavModel,
  listCategoryNavModels,
} from '../src/lib/docs/source/category-nav-fs';

describe('category-nav', () => {
  it('reads placement', () => {
    assert.equal(readCategoryNav(undefined), false);
    assert.equal(readCategoryNav(false), false);
    assert.equal(readCategoryNav('header'), 'header');
    assert.equal(readCategoryNav('select'), 'select');
    assert.equal(readCategoryNav('sidebar'), 'select');
    assert.equal(readCategoryNav('navbar-sub'), false);
  });

  it('builds rpa model from disk categoryAxis', () => {
    const model = buildCategoryNavModel('rpa');
    assert.ok(model);
    assert.equal(model.placement, 'header');
    assert.equal(model.title, '生态');
    assert.equal(model.prefix, '/docs/rpa');
    assert.ok(model.items.some((row) => row.key === 'taobao' && row.item === '淘系'));
    assert.equal(model.keyByUrl['/docs/rpa/RPA_QIANNIU'], 'taobao');
    assert.ok(model.items.some((row) => row.key === 'zhifubao' && row.item === '支付宝'));
    assert.equal(model.keyByUrl['/docs/rpa/RPA_ZHIFUBAOTG'], 'zhifubao');
    assert.equal(model.keyByUrl['/docs/rpa/RPA_JDSZ'], 'jingdong');
    assert.ok(model.items.some((row) => row.key === 'doudian' && row.item === '抖音'));
    assert.ok(model.items.some((row) => row.key === 'zonghe' && row.item === '综合'));
    assert.equal(model.keyByUrl['/docs/rpa/RPA_YUNHUITOU'], 'zonghe');
    assert.equal(model.keyByUrl['/docs/rpa/RPA_UNIVERSAL'], 'zonghe');
    assert.equal(model.keyByUrl['/docs/rpa/RPA_JULIANG'], 'doudian');
  });

  it('lists only partitions that enable categoryNav with items', () => {
    const models = listCategoryNavModels();
    assert.equal(models.length, 1);
    assert.equal(models[0]?.prefix, '/docs/rpa');
  });

  it('matches partition by pathname', () => {
    const models = listCategoryNavModels();
    assert.equal(matchCategoryNavModel('/docs/rpa', models)?.prefix, '/docs/rpa');
    assert.equal(
      matchCategoryNavModel('/docs/rpa/RPA_ALIMM/DMP', models)?.prefix,
      '/docs/rpa',
    );
    assert.equal(matchCategoryNavModel('/docs/auth', models), null);
  });

  it('infers key from platform path, all on overview', () => {
    const model = buildCategoryNavModel('rpa')!;
    assert.equal(inferredCategoryNavKey('/docs/rpa', model), null);
    assert.equal(inferredCategoryNavKey('/docs/rpa/', model), null);
    assert.equal(
      inferredCategoryNavKey('/docs/rpa/RPA_QIANNIU', model),
      'taobao',
    );
    assert.equal(
      inferredCategoryNavKey(
        '/docs/rpa/RPA_ALIMM/DMP/rpa-conn-alimm-dmp-compete-situation-item',
        model,
      ),
      'taobao',
    );
    assert.equal(
      inferredCategoryNavKey('/docs/rpa/RPA_JINGMAI', model),
      'jingdong',
    );
  });

  it('filters sidebar folders by selected key only', () => {
    const model = buildCategoryNavModel('rpa')!;
    const base = {
      keyByUrl: model.keyByUrl,
      prefix: model.prefix,
    };
    assert.equal(
      sidebarNodePassesCategoryNav({
        ...base,
        selectedKey: 'taobao',
        nodeUrl: '/docs/rpa/RPA_QIANNIU',
      }),
      true,
    );
    assert.equal(
      sidebarNodePassesCategoryNav({
        ...base,
        selectedKey: 'taobao',
        nodeUrl: '/docs/rpa/RPA_JDSZ',
      }),
      false,
    );
    assert.equal(
      sidebarNodePassesCategoryNav({
        ...base,
        selectedKey: 'taobao',
        nodeUrl: '/docs/rpa',
      }),
      true,
    );
    assert.equal(
      sidebarNodePassesCategoryNav({
        ...base,
        selectedKey: null,
        nodeUrl: '/docs/rpa/RPA_JDSZ',
      }),
      true,
    );
  });

  it('does not keep another ecosystem folder just because it is the current page', () => {
    const model = buildCategoryNavModel('rpa')!;
    assert.equal(
      sidebarNodePassesCategoryNav({
        selectedKey: 'jingdong',
        nodeUrl: '/docs/rpa/RPA_QIANNIU',
        keyByUrl: model.keyByUrl,
        prefix: model.prefix,
      }),
      false,
    );
  });

  it('selection follows ?nav= only, never the current page path', () => {
    const model = buildCategoryNavModel('rpa')!;
    assert.equal(resolveCategoryNavSelection('doudian', model), 'doudian');
    assert.equal(resolveCategoryNavSelection('nope', model), null);
    assert.equal(resolveCategoryNavSelection(null, model), null);
    assert.equal(categoryNavHref(model, null), '/docs/rpa');
    assert.equal(categoryNavHref(model, 'doudian'), '/docs/rpa?nav=doudian');
  });

  it('keeps sidebar hrefs on the current filter without inferring from path', () => {
    assert.equal(
      withCategoryNavQuery('/docs/rpa/RPA_QIANNIU', 'taobao'),
      '/docs/rpa/RPA_QIANNIU?nav=taobao',
    );
    assert.equal(
      withCategoryNavQuery('/docs/rpa/RPA_QIANNIU?nav=taobao', null),
      '/docs/rpa/RPA_QIANNIU',
    );
    assert.equal(
      withCategoryNavQuery('/docs/rpa/RPA_QIANNIU#top', 'jingdong'),
      '/docs/rpa/RPA_QIANNIU?nav=jingdong#top',
    );
    assert.equal(
      withCategoryNavQuery('https://example.com/docs', 'taobao'),
      'https://example.com/docs',
    );
  });

  it('does not filter while sidebar search is active', () => {
    const model = buildCategoryNavModel('rpa')!;
    assert.equal(
      sidebarNodePassesCategoryNav({
        selectedKey: 'taobao',
        nodeUrl: '/docs/rpa/RPA_JDSZ',
        keyByUrl: model.keyByUrl,
        prefix: model.prefix,
        isFiltering: true,
      }),
      true,
    );
  });
});
