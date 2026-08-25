import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isCompactPaneWidth,
  TOC_COMPACT_EXIT_PX,
  TOC_COMPACT_MAX_PX,
} from '../src/lib/docs/toc-compact';

describe('isCompactPaneWidth', () => {
  it('enters compact below 64rem', () => {
    assert.equal(isCompactPaneWidth(TOC_COMPACT_MAX_PX - 1), true);
    assert.equal(isCompactPaneWidth(TOC_COMPACT_MAX_PX), false);
  });

  it('does not leave compact until the pane is wider than the toc-width delta', () => {
    const mid = TOC_COMPACT_MAX_PX + 80;
    assert.equal(isCompactPaneWidth(mid, false), false);
    assert.equal(isCompactPaneWidth(mid, true), true);
    assert.equal(isCompactPaneWidth(TOC_COMPACT_EXIT_PX, true), false);
  });
});
