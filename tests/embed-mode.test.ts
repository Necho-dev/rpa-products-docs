import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEmbedMode, hasInvalidEmbedMode } from '../src/lib/auth/cube-embed';

describe('getEmbedMode', () => {
  it('读 Query mode=page', () => {
    assert.equal(
      getEmbedMode(new Request('http://127.0.0.1:3000/docs/foo?mode=page')),
      'page',
    );
  });

  it('读 Query mode=llms', () => {
    assert.equal(
      getEmbedMode(new Request('http://127.0.0.1:3000/docs/foo?mode=llms')),
      'llms',
    );
  });

  it('忽略 X-Docs-Mode Header', () => {
    assert.equal(
      getEmbedMode(
        new Request('http://127.0.0.1:3000/docs/foo', {
          headers: { 'x-docs-mode': 'llms' },
        }),
      ),
      null,
    );
  });

  it('Header 不能覆盖 Query', () => {
    assert.equal(
      getEmbedMode(
        new Request('http://127.0.0.1:3000/docs/foo?mode=page', {
          headers: { 'x-docs-mode': 'llms' },
        }),
      ),
      'page',
    );
  });

  it('旧 render 参数不触发嵌入', () => {
    assert.equal(
      getEmbedMode(new Request('http://127.0.0.1:3000/docs/foo?render=html')),
      null,
    );
    assert.equal(
      hasInvalidEmbedMode(new Request('http://127.0.0.1:3000/docs/foo?render=html')),
      false,
    );
  });

  it('非法 mode 可识别', () => {
    const req = new Request('http://127.0.0.1:3000/docs/foo?mode=html');
    assert.equal(getEmbedMode(req), null);
    assert.equal(hasInvalidEmbedMode(req), true);
  });
});
