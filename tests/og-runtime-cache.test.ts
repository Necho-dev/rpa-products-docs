import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getOrCreateOgPng, ogCacheKey } from '../src/lib/docs/og/runtime-cache';

describe('og-runtime-cache', () => {
  it('includes origin in the cache key', () => {
    const a = ogCacheKey({
      variant: 'poster.png',
      origin: 'https://a.example',
      pageUrl: '/docs/x',
      fingerprint: '1',
    });
    const b = ogCacheKey({
      variant: 'poster.png',
      origin: 'https://b.example',
      pageUrl: '/docs/x',
      fingerprint: '1',
    });
    assert.notEqual(a, b);
  });

  it('single-flights concurrent renders for the same key', async () => {
    let renders = 0;
    const key = `sf-${Date.now()}`;
    const render = async () => {
      renders += 1;
      await new Promise((r) => setTimeout(r, 20));
      return Buffer.from(`png-${renders}`);
    };
    const [a, b] = await Promise.all([
      getOrCreateOgPng({ key, ttlMs: 60_000, render }),
      getOrCreateOgPng({ key, ttlMs: 60_000, render }),
    ]);
    assert.equal(renders, 1);
    assert.equal(a.equals(b), true);
  });

  it('reuses cached buffer within ttl', async () => {
    const key = `hit-${Date.now()}`;
    let renders = 0;
    const first = await getOrCreateOgPng({
      key,
      ttlMs: 60_000,
      render: async () => {
        renders += 1;
        return Buffer.from('one');
      },
    });
    const second = await getOrCreateOgPng({
      key,
      ttlMs: 60_000,
      render: async () => {
        renders += 1;
        return Buffer.from('two');
      },
    });
    assert.equal(renders, 1);
    assert.equal(first.equals(second), true);
  });
});
