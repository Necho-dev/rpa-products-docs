import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeDocsImageRelativePath,
  readDocsImageFile,
} from '@/lib/docs/resources/read-docs-image';

describe('normalizeDocsImageRelativePath', () => {
  it('strips absolute resource URL and query', () => {
    assert.equal(
      normalizeDocsImageRelativePath(
        'http://127.0.0.1:3000/resources/images/rpa/_public/images/a.png?tm=1&sg=x',
      ),
      'rpa/_public/images/a.png',
    );
  });

  it('rejects path traversal', () => {
    assert.equal(normalizeDocsImageRelativePath('../../etc/passwd'), null);
  });
});

describe('readDocsImageFile', () => {
  it('reads an existing docs screenshot', async () => {
    const r = await readDocsImageFile(
      '/resources/images/rpa/_public/images/qianniu/finance_bail_account_detail_20260715.png',
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.mimeType, 'image/png');
    assert.ok(r.data.byteLength > 100);
  });

  it('returns 404 for missing image', async () => {
    const r = await readDocsImageFile(
      'rpa/_public/images/__does_not_exist_unit_test__.png',
    );
    assert.deepEqual(r, {
      ok: false,
      error: 'image not found',
      status: 404,
    });
  });
});
