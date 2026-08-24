import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDocsViewContext } from '../src/lib/docs/docs-view-context';

const origin = 'https://knowledge.example.com';
const leftPath = '/docs/rpa/RPA_UNIVERSAL/rpa-conn-universal-weather-nmc-forecast-detail';
const rightPath = '/docs/rpa/RPA_UNIVERSAL/rpa-conn-universal-weather-cma-forecast-detail';

describe('buildDocsViewContext', () => {
  it('reports single-pane when peek is closed', () => {
    const ctx = buildDocsViewContext({
      href: `${origin}${leftPath}`,
      origin,
      leftPath,
      leftTitle: '中央气象台预报',
      peekOpen: false,
      peekDesktop: true,
      rightPath,
      rightTitle: '忽略',
    });
    assert.equal(ctx.layout, 'single');
    assert.equal(ctx.left.path, leftPath);
    assert.equal(ctx.left.title, '中央气象台预报');
    assert.equal(ctx.right, undefined);
  });

  it('reports split with left and right docs on desktop peek', () => {
    const ctx = buildDocsViewContext({
      href: `${origin}${leftPath}`,
      origin,
      leftPath,
      leftTitle: '左栏文档',
      peekOpen: true,
      peekDesktop: true,
      rightPath,
      rightHash: '#目标页面',
      rightTitle: '右栏文档',
    });
    assert.equal(ctx.layout, 'split');
    assert.equal(ctx.left.title, '左栏文档');
    assert.equal(ctx.right?.path, rightPath);
    assert.equal(ctx.right?.title, '右栏文档');
    assert.equal(ctx.right?.url, `${origin}${rightPath}#目标页面`);
  });

  it('reports sheet layout for mobile peek overlay', () => {
    const ctx = buildDocsViewContext({
      href: `${origin}${leftPath}`,
      origin,
      leftPath,
      peekOpen: true,
      peekDesktop: false,
      rightPath,
    });
    assert.equal(ctx.layout, 'sheet');
    assert.ok(ctx.right);
    assert.equal(ctx.right?.title, undefined);
  });
});
