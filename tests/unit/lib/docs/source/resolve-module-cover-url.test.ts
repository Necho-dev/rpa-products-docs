import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveModuleCoverUrl } from '@/lib/docs/source/resolve-module-cover-url';

describe('resolveModuleCoverUrl', () => {
  it('returns undefined when grid cover is false and no page override', () => {
    assert.equal(
      resolveModuleCoverUrl(['RPA_ALIMM', 'rpa-conn-alimm-pxb-foo']),
      undefined,
    );
  });

  it('includes cover when grid cover is true', () => {
    const url = resolveModuleCoverUrl(
      ['RPA_ALIMM', 'rpa-conn-alimm-pxb-foo'],
      { gridCover: true },
    );
    assert.ok(url?.includes('/cover.png?'));
    assert.match(url!, /[?&]v=\d+/);
  });

  it('respects module.cover: true when grid cover is false', () => {
    const url = resolveModuleCoverUrl(['RPA_ALIMM'], {
      gridCover: false,
      cover: true,
    });
    assert.ok(url?.includes('/og/docs/RPA_ALIMM/cover.png?'));
  });

  it('respects module.cover: false when grid cover is true', () => {
    assert.equal(
      resolveModuleCoverUrl(
        ['RPA_ALIMM', 'rpa-conn-alimm-pxb-foo'],
        { gridCover: true, cover: false },
      ),
      undefined,
    );
  });
});
