import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectScheduleAnnotations,
  DEFAULT_SCHEDULE_DESCRIPTIONS,
} from '../src/lib/docs/format-schedule-meta';

describe('collectScheduleAnnotations', () => {
  it('uses custom description when present and default otherwise', () => {
    const rows = collectScheduleAnnotations({
      estimatedDuration: { sec: 60, description: '高峰期可能到 10 分钟。' },
      minInterval: { min: 5 },
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.label, '预估耗时');
    assert.equal(rows[0]!.value, '1 分钟');
    assert.equal(rows[0]!.description, '高峰期可能到 10 分钟。');
    assert.equal(rows[1]!.label, '最小间隔');
    assert.equal(rows[1]!.description, DEFAULT_SCHEDULE_DESCRIPTIONS.minInterval);
  });

  it('returns empty when no schedule fields are set', () => {
    assert.deepEqual(collectScheduleAnnotations({}), []);
  });
});
