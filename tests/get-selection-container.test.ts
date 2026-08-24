import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { describe, it } from 'node:test';
import {
  findContainerForNode,
  findContainerForPagePath,
  findPeekContentRoot,
} from '../src/lib/docs/selection/get-selection-in-container';

function withDom(html: string, run: () => void) {
  const dom = new JSDOM(html, { url: 'https://knowledge.example.com/docs/left' });
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  globalThis.window = dom.window as unknown as typeof globalThis.window;
  globalThis.document = dom.window.document;
  try {
    run();
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    dom.window.close();
  }
}

describe('findContainerForNode', () => {
  it('routes peek article nodes to the peek surface', () => {
    withDom(
      `<html><body>
        <div id="nd-page"><p id="main-p">left</p></div>
        <div data-doc-peek="true" data-doc-path="/docs/right"><article><p id="peek-p">right</p></article></div>
      </body></html>`,
      () => {
        const peekP = document.getElementById('peek-p')!;
        const mainP = document.getElementById('main-p')!;
        assert.equal(findContainerForNode(peekP)?.surface, 'peek');
        assert.equal(findContainerForNode(mainP)?.surface, 'main');
        assert.equal(findPeekContentRoot()?.querySelector('#peek-p'), peekP);
        assert.equal(findContainerForPagePath('/docs/right')?.contains(peekP), true);
        assert.equal(findContainerForPagePath('/docs/left')?.contains(mainP), true);
      },
    );
  });
});
