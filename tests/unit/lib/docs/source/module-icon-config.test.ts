import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeModuleIcon } from '@/lib/docs/source/module-icon-config';

describe('normalizeModuleIcon', () => {
  it('accepts string shorthand', () => {
    assert.deepEqual(normalizeModuleIcon('Bot'), { comp: 'Bot' });
  });

  it('accepts object with comp and color', () => {
    assert.deepEqual(normalizeModuleIcon({ comp: 'BarChart2', color: '#7c3aed' }), {
      comp: 'BarChart2',
      color: '#7c3aed',
    });
  });

  it('omits color when not set', () => {
    assert.deepEqual(normalizeModuleIcon({ comp: 'Store' }), { comp: 'Store' });
  });

  it('returns undefined for empty input', () => {
    assert.equal(normalizeModuleIcon(''), undefined);
    assert.equal(normalizeModuleIcon(undefined), undefined);
  });
});
