import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { describe, it } from 'node:test';
import {
  applyHeadingScope,
  applyPeekHeadingScope,
  peekHeadingId,
  peekTocHref,
  referencePreviewHeadingPrefix,
} from '../src/lib/docs/peek-heading-id';
import { findAnchorInRoot } from '../src/lib/docs/smooth-scroll-to-anchor';

describe('peek heading ids', () => {
  it('prefixes hashes once', () => {
    assert.equal(peekHeadingId('业务入参'), 'peek--业务入参');
    assert.equal(peekHeadingId('peek--业务入参'), 'peek--业务入参');
    assert.equal(peekTocHref('#数据样例'), '#peek--数据样例');
    assert.equal(peekTocHref('#peek--数据样例'), '#peek--数据样例');
  });

  it('rewrites colliding heading ids and in-article anchors', () => {
    const dom = new JSDOM(`<div>
      <h2 id="业务入参">params</h2>
      <h2 id="other">other</h2>
      <a href="#业务入参">go</a>
    </div>`);
    const root = dom.window.document.body.firstElementChild!;
    applyPeekHeadingScope(root, ['业务入参']);
    assert.equal(root.querySelector('h2')?.id, 'peek--业务入参');
    assert.equal(root.querySelector('#other')?.id, 'other');
    assert.equal(root.querySelector('a')?.getAttribute('href'), '#peek--业务入参');
  });

  it('scopes inline preview headings with a per-url prefix', () => {
    assert.equal(
      referencePreviewHeadingPrefix('/docs/rpa/RPA_QIANNIU'),
      'ref-rpa-RPA-QIANNIU--',
    );
    const dom = new JSDOM(`<div>
      <h2 id="业务入参">params</h2>
      <a href="#业务入参">go</a>
    </div>`);
    const root = dom.window.document.body.firstElementChild!;
    applyHeadingScope(root, ['业务入参'], 'ref-demo--');
    assert.equal(root.querySelector('h2')?.id, 'ref-demo--业务入参');
    assert.equal(root.querySelector('a')?.getAttribute('href'), '#ref-demo--业务入参');
  });

  it('finds prefixed or original heading ids in a pane', () => {
    const dom = new JSDOM(`<div id="root"><h2 id="peek--入参校验">right</h2></div>`);
    const prevDocument = globalThis.document;
    globalThis.document = dom.window.document as unknown as Document;
    try {
      const root = dom.window.document.getElementById('root')!;
      assert.equal(findAnchorInRoot('入参校验', root)?.textContent, 'right');
      assert.equal(findAnchorInRoot('peek--入参校验', root)?.textContent, 'right');
    } finally {
      globalThis.document = prevDocument;
      dom.window.close();
    }
  });

  it('finds preview-scoped heading ids in the inline frame', () => {
    const dom = new JSDOM(`<div id="root"><h2 id="ref-demo--入参校验">preview</h2></div>`);
    const prevDocument = globalThis.document;
    globalThis.document = dom.window.document as unknown as Document;
    try {
      const root = dom.window.document.getElementById('root')!;
      assert.equal(findAnchorInRoot('ref-demo--入参校验', root)?.textContent, 'preview');
      assert.equal(findAnchorInRoot('入参校验', root)?.textContent, 'preview');
    } finally {
      globalThis.document = prevDocument;
      dom.window.close();
    }
  });
});
