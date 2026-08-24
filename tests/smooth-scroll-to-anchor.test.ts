import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { describe, it } from 'node:test';
import {
  findAnchorInRoot,
  getAnchorQueryRoot,
  getAnchorScrollRoot,
  getStickyOverlapOffset,
  handleDocsAnchorClick,
  hashIdFromHref,
  samePathname,
} from '../src/lib/docs/smooth-scroll-to-anchor';

function withDom(html: string, url: string, run: () => void) {
  const dom = new JSDOM(html, { url });
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevHistory = globalThis.history;
  globalThis.window = dom.window as unknown as typeof globalThis.window;
  globalThis.document = dom.window.document;
  globalThis.history = dom.window.history;
  try {
    run();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.history = prevHistory;
    dom.window.close();
  }
}

describe('hashIdFromHref', () => {
  it('decodes chinese section hashes', () => {
    assert.equal(hashIdFromHref('#入参校验'), '入参校验');
    assert.equal(
      hashIdFromHref('#%E5%85%A5%E5%8F%82%E6%A0%A1%E9%AA%8C'),
      '入参校验',
    );
  });

  it('ignores empty, text fragments, and hash paths', () => {
    assert.equal(hashIdFromHref('#'), null);
    assert.equal(hashIdFromHref('#:~:text=foo'), null);
  });
});

describe('samePathname', () => {
  it('treats trailing slash as the same page', () => {
    assert.equal(samePathname('/docs/foo', '/docs/foo/'), true);
  });
});

describe('anchor root scoping', () => {
  it('finds the heading in the clicked column when ids collide', () => {
    withDom(
      `<html><body>
        <div id="nd-page"><h2 id="入参校验">left</h2></div>
        <aside data-doc-peek-panel="">
          <div data-doc-peek-scroll="">
            <h2 id="入参校验">right</h2>
            <nav data-doc-peek-toc=""><a id="peek-link" href="#入参校验">入参校验</a></nav>
          </div>
        </aside>
      </body></html>`,
      'https://knowledge.example.com/docs/left',
      () => {
        const link = document.getElementById('peek-link')!;
        const scrollRoot = getAnchorScrollRoot(link);
        assert.equal((scrollRoot as HTMLElement).getAttribute('data-doc-peek-scroll'), '');
        const heading = findAnchorInRoot('入参校验', getAnchorQueryRoot(scrollRoot));
        assert.equal(heading?.textContent, 'right');
      },
    );
  });
});

describe('getStickyOverlapOffset', () => {
  it('adds sticky header overlap for window scroll, not inner panes', () => {
    withDom(
      `<html><body>
        <header id="nd-subnav">nav</header>
        <div id="nd-page"></div>
      </body></html>`,
      'https://knowledge.example.com/docs/page',
      () => {
        const header = document.getElementById('nd-subnav')!;
        header.getBoundingClientRect = () =>
          ({
            top: 0,
            bottom: 104,
            left: 0,
            right: 800,
            width: 800,
            height: 104,
            x: 0,
            y: 0,
            toJSON() {},
          }) as DOMRect;
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
        assert.equal(getStickyOverlapOffset(window), 116);
        assert.equal(getStickyOverlapOffset(document.getElementById('nd-page')!), 12);
      },
    );
  });
});

describe('handleDocsAnchorClick', () => {
  it('prevents the default jump and updates the hash', () => {
    withDom(
      `<html><body>
        <div id="nd-page">
          <h2 id="数据字段">字段</h2>
        </div>
        <nav id="nd-toc"><a id="toc-link" href="#数据字段">数据字段</a></nav>
      </body></html>`,
      'https://knowledge.example.com/docs/page',
      () => {
        const link = document.getElementById('toc-link')!;
        let prevented = false;
        const event = new document.defaultView!.MouseEvent('click', { bubbles: true, button: 0 });
        Object.defineProperty(event, 'target', { value: link });
        Object.defineProperty(event, 'preventDefault', {
          value: () => {
            prevented = true;
          },
        });
        const handled = handleDocsAnchorClick(event);
        assert.equal(handled, true);
        assert.equal(prevented, true);
        assert.equal(decodeURIComponent(window.location.hash), '#数据字段');
      },
    );
  });
});
