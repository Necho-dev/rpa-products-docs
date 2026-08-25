import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  appendixTabFromHeadingId,
  appendixTocItems,
  bareAppendixHeadingId,
} from '../src/lib/docs/doc-appendix';

describe('appendixTocItems', () => {
  it('returns nothing when both sections are absent', () => {
    assert.deepEqual(appendixTocItems({ citedBy: 0, annotations: 0 }), []);
  });

  it('lists 指标注释 before 本文被引用, both as h2, without 附录', () => {
    const items = appendixTocItems({ citedBy: 1, annotations: 2 });
    assert.deepEqual(
      items.map((item) => ({ title: item.title, depth: item.depth })),
      [
        { title: '指标注释(2)', depth: 2 },
        { title: '本文被引用(1)', depth: 2 },
      ],
    );
  });

  it('omits the unused section and still has no 附录 parent', () => {
    const notes = appendixTocItems({ citedBy: 0, annotations: 1 });
    assert.deepEqual(
      notes.map((item) => ({ title: item.title, depth: item.depth })),
      [{ title: '指标注释(1)', depth: 2 }],
    );
  });
});

describe('appendixTabFromHeadingId', () => {
  const both = { hasCited: true, hasNotes: true };

  it('strips peek and preview prefixes', () => {
    assert.equal(bareAppendixHeadingId('#peek--doc-cited-by'), 'doc-cited-by');
    assert.equal(bareAppendixHeadingId('ref-foo--doc-annotations'), 'doc-annotations');
  });

  it('maps hash to the matching tab', () => {
    assert.equal(appendixTabFromHeadingId('#doc-annotations', both), 'notes');
    assert.equal(appendixTabFromHeadingId('#peek--doc-cited-by', both), 'cited');
    assert.equal(appendixTabFromHeadingId('#业务入参', both), null);
  });
});
