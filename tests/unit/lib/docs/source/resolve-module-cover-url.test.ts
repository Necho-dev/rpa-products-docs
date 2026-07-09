import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveModuleCoverUrl } from '@/lib/docs/source/resolve-module-cover-url';

describe('resolveModuleCoverUrl', () => {
  it('returns undefined when grid cover is false and no page override', () => {
    assert.equal(
      resolveModuleCoverUrl(['connectors', 'RPA_ALIMM', 'rpa-conn-alimm-pxb-foo']),
      undefined,
    );
  });

  it('includes cover when grid cover is true', () => {
    const url = resolveModuleCoverUrl(
      ['connectors', 'RPA_ALIMM', 'rpa-conn-alimm-pxb-foo'],
      { gridCover: true },
    );
    assert.ok(url?.endsWith('/cover.png'));
  });

  it('respects moduleCover: true when grid cover is false', () => {
    const url = resolveModuleCoverUrl(['connectors', 'RPA_ALIMM'], {
      gridCover: false,
      moduleCover: true,
    });
    assert.ok(url?.includes('/og/docs/connectors/RPA_ALIMM/cover.png'));
  });

  it('respects moduleCover: false when grid cover is true', () => {
    assert.equal(
      resolveModuleCoverUrl(
        ['connectors', 'RPA_ALIMM', 'rpa-conn-alimm-pxb-foo'],
        { gridCover: true, moduleCover: false },
      ),
      undefined,
    );
  });
});
