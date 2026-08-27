import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RootContent } from 'mdast';
import {
  buildGroupAnchorId,
  buildTocOnlyGroupHeading,
  findPrecedingHeading,
  parsePrecedingCategoryFilterHeadingId,
} from '@/lib/docs/source/doc-block-toc';

describe('buildGroupAnchorId', () => {
  it('combines section id and group key', () => {
    assert.equal(buildGroupAnchorId('内含连接器', 'item'), '内含连接器-item');
  });
});

describe('findPrecedingHeading', () => {
  it('returns nearest heading above index with hProperties id', () => {
    const siblings: RootContent[] = [
      {
        type: 'heading',
        depth: 2,
        children: [{ type: 'text', value: '内含连接器' }],
        data: { hProperties: { id: '内含连接器' } },
      },
      { type: 'paragraph', children: [{ type: 'text', value: 'x' }] },
    ];

    assert.deepEqual(findPrecedingHeading(siblings, 2), {
      depth: 2,
      id: '内含连接器',
    });
  });

  it('derives slug from heading text when hProperties id is missing', () => {
    const siblings: RootContent[] = [
      {
        type: 'heading',
        depth: 2,
        children: [{ type: 'text', value: '内含连接器' }],
      },
      { type: 'paragraph', children: [{ type: 'text', value: 'x' }] },
    ];

    assert.deepEqual(findPrecedingHeading(siblings, 2), {
      depth: 2,
      id: '内含连接器',
    });
  });

  it('returns null when no heading exists', () => {
    assert.equal(findPrecedingHeading([], 0), null);
  });
});

describe('parsePrecedingCategoryFilterHeadingId', () => {
  it('slugs the heading above category-filter', () => {
    assert.equal(
      parsePrecedingCategoryFilterHeadingId(
        ['## 连接器', '', ':::category-filter', 'layout: tabs', ':::'].join('\n'),
      ),
      '连接器',
    );
  });
});

describe('buildTocOnlyGroupHeading', () => {
  it('creates depth+1 heading with toc-only markers', () => {
    const node = buildTocOnlyGroupHeading(
      '内含连接器',
      { key: 'item', label: '商品/Item' },
      2,
    );

    assert.equal(node.type, 'heading');
    assert.equal((node as { depth: number }).depth, 3);
    assert.deepEqual(
      (node as { data?: { hProperties?: { id?: string } } }).data?.hProperties,
      { id: '内含连接器-item' },
    );
    assert.match(
      (node as { children: { value: string }[] }).children[0]!.value,
      /^商品\/Item \[toc\]$/,
    );
  });
});
