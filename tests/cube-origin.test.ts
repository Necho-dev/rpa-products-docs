import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveRequestCubeOrigin } from '../src/lib/auth/cube';

describe('resolveRequestCubeOrigin', () => {
  it('从 Referer 取魔方 origin', () => {
    const origin = resolveRequestCubeOrigin(
      new Request('http://127.0.0.1:3000/docs/foo', {
        headers: { referer: 'http://127.0.0.1:8765/app?tab=docs' },
      }),
    );
    assert.equal(origin, 'http://127.0.0.1:8765');
  });

  it('无 Referer 时从 Origin 兜底', () => {
    const origin = resolveRequestCubeOrigin(
      new Request('http://127.0.0.1:3000/docs/foo', {
        headers: { origin: 'https://cube.example.com' },
      }),
    );
    assert.equal(origin, 'https://cube.example.com');
  });

  it('忽略文档站自身 origin', () => {
    const origin = resolveRequestCubeOrigin(
      new Request('http://127.0.0.1:3000/docs/foo', {
        headers: { referer: 'http://127.0.0.1:3000/docs/bar', origin: 'http://127.0.0.1:3000' },
      }),
    );
    assert.equal(origin, null);
  });
});
