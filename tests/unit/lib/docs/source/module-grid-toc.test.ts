import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RootContent } from 'mdast';
import {
  buildModuleGridGroupAnchorId,
  buildModuleGridGroupAnchors,
  buildTocOnlyGroupHeading,
  findPrecedingHeading,
  groupKeyFromLocationHash,
  shouldInjectModuleGridTocHeadings,
} from '@/lib/docs/source/module-grid-toc';

describe('buildModuleGridGroupAnchorId', () => {
  it('combines section id and group key', () => {
    assert.equal(buildModuleGridGroupAnchorId('内含连接器', 'item'), '内含连接器-item');
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

describe('shouldInjectModuleGridTocHeadings', () => {
  it('injects only when more than one non-empty group', () => {
    assert.equal(shouldInjectModuleGridTocHeadings([]), false);
    assert.equal(
      shouldInjectModuleGridTocHeadings([
        { key: 'item', label: 'I', modules: [{ title: 't', href: './a', code: 'c' }] },
      ]),
      false,
    );
    assert.equal(
      shouldInjectModuleGridTocHeadings([
        { key: 'item', label: 'I', modules: [{ title: 't', href: './a', code: 'c' }] },
        { key: 'shop', label: 'S', modules: [{ title: 't', href: './b', code: 'c' }] },
      ]),
      true,
    );
  });
});

describe('buildModuleGridGroupAnchors', () => {
  it('maps non-empty groups to anchor ids', () => {
    const anchors = buildModuleGridGroupAnchors('内含连接器', [
      { key: 'item', label: '商品/Item', modules: [{ title: 't', href: './a', code: 'c' }] },
      { key: 'shop', label: '店铺/Shop', modules: [] },
    ]);

    assert.deepEqual(anchors, [
      { key: 'item', label: '商品/Item', anchorId: '内含连接器-item' },
    ]);
  });
});

describe('groupKeyFromLocationHash', () => {
  const anchors = [
    { key: 'item', label: '商品/Item', anchorId: '内含连接器-item' },
    { key: 'shop', label: '店铺/Shop', anchorId: '内含连接器-shop' },
  ];

  it('resolves group key from hash', () => {
    assert.equal(groupKeyFromLocationHash('#内含连接器-shop', anchors), 'shop');
    assert.equal(groupKeyFromLocationHash('', anchors), null);
    assert.equal(groupKeyFromLocationHash('#unknown', anchors), null);
  });
});
