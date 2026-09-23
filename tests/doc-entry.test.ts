import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inferDocEntry } from '../src/lib/docs/source/doc-entry';

describe('inferDocEntry', () => {
  it('uses the markdown filename when entry is absent', () => {
    assert.equal(
      inferDocEntry(
        'api/京东广告_JINGDONG_ADV/JINGDONG_SP/connector_5KqcZ90CYI_ods_api_jingdong_sp.md',
      ),
      'connector_5KqcZ90CYI_ods_api_jingdong_sp',
    );
  });

  it('does not treat a folder index as an entry', () => {
    assert.equal(inferDocEntry('content/docs/api/index.md'), undefined);
    assert.equal(inferDocEntry('content/docs/rpa/RPA_QIANNIU/index.mdx'), undefined);
  });

  it('returns undefined without a path', () => {
    assert.equal(inferDocEntry(undefined), undefined);
  });
});
