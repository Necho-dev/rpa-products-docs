import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateConnectorBadgeStats,
  UNLABELED_BADGE_LABEL,
} from '@/lib/docs/source/connector-badge-stats';

describe('aggregateConnectorBadgeStats', () => {
  it('aggregates arbitrary badge labels without fixed enums', () => {
    const result = aggregateConnectorBadgeStats([
      { label: '已上线', color: '#16a34a' },
      { label: 'Beta', color: '#2563eb' },
      { label: '已上线', color: '#16a34a' },
      { label: '实验中' },
      { label: 'Beta', color: '#2563eb' },
      undefined,
      { label: '  ' },
      { label: '待上线', color: '#ea580c' },
    ]);

    assert.equal(result.connectorTotal, 8);
    assert.deepEqual(
      result.connectorBadgeStats.map((s) => ({ label: s.label, count: s.count })),
      [
        { label: '已上线', count: 2 },
        { label: 'Beta', count: 2 },
        { label: '待上线', count: 1 },
        { label: '实验中', count: 1 },
        { label: UNLABELED_BADGE_LABEL, count: 2 },
      ],
    );
  });

  it('keeps first seen color for a label', () => {
    const result = aggregateConnectorBadgeStats([
      { label: 'Beta', color: '#111111' },
      { label: 'Beta', color: '#222222' },
    ]);
    assert.equal(result.connectorBadgeStats[0]?.color, '#111111');
  });

  it('returns empty stats for empty input', () => {
    const result = aggregateConnectorBadgeStats([]);
    assert.equal(result.connectorTotal, 0);
    assert.deepEqual(result.connectorBadgeStats, []);
  });
});
