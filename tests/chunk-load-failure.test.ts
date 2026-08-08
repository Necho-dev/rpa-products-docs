import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isChunkLoadFailure } from '../src/lib/observability/chunk-load-failure';

describe('isChunkLoadFailure', () => {
  it('detects ChunkLoadError by name', () => {
    assert.equal(isChunkLoadFailure({ name: 'ChunkLoadError', message: 'x' }), true);
  });

  it('detects common dynamic import failure messages', () => {
    assert.equal(isChunkLoadFailure(new Error('Loading chunk 123 failed.')), true);
    assert.equal(
      isChunkLoadFailure(new Error('Failed to fetch dynamically imported module: /_next/static/chunks/foo.js')),
      true,
    );
    assert.equal(isChunkLoadFailure('Importing a module script failed.'), true);
  });

  it('ignores unrelated errors', () => {
    assert.equal(isChunkLoadFailure(null), false);
    assert.equal(isChunkLoadFailure(new Error('Network request failed')), false);
    assert.equal(isChunkLoadFailure({ name: 'TypeError', message: 'x is not a function' }), false);
  });
});
