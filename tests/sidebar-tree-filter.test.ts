import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Folder, Item, Root } from 'fumadocs-core/page-tree';
import {
  collectMatchIds,
  collectSidebarBadges,
  folderHasBadge,
  nodePassesBadge,
} from '../src/components/docs/sidebar-tree-search';
import type {
  SidebarFolderWithBadge,
  SidebarItemWithBadge,
} from '../src/lib/docs/source/docs-entry-in-sidebar-plugin';

function page(
  name: string,
  opts?: { entry?: string; badge?: { label: string; color?: string } },
): SidebarItemWithBadge {
  return {
    type: 'page',
    name,
    url: `/docs/${name}`,
    description: opts?.entry,
    badge: opts?.badge,
  };
}

function folder(
  name: string,
  children: Folder['children'],
  opts?: { badge?: { label: string; color?: string } },
): SidebarFolderWithBadge {
  return {
    type: 'folder',
    name,
    children,
    badge: opts?.badge,
  };
}

const tree: Root = {
  name: 'rpa',
  children: [
    page('概览'),
    folder('千牛', [
      page('账单', {
        entry: 'rpa.conn.qianniu.bill',
        badge: { label: '已上线', color: '#16A34A' },
      }),
      page('待发布', {
        entry: 'rpa.conn.qianniu.draft',
        badge: { label: '待上线', color: '#EAB308' },
      }),
      page('无标记', { entry: 'rpa.conn.qianniu.plain' }),
    ]),
    folder('得物', [
      page('订单', {
        entry: 'rpa.conn.dewu.order',
        badge: { label: '已上线', color: '#16A34A' },
      }),
    ]),
  ],
};

describe('collectSidebarBadges', () => {
  it('aggregates labels with color and count, skipping unlabeled', () => {
    const opts = collectSidebarBadges(tree);
    assert.deepEqual(
      opts.map((o) => o.label),
      ['已上线', '待上线'],
    );
    assert.equal(opts[0]?.count, 2);
    assert.equal(opts[0]?.color, '#16A34A');
    assert.equal(opts[1]?.count, 1);
    assert.equal(opts[1]?.color, '#EAB308');
  });

  it('keeps first seen color when the same label has mixed colors', () => {
    const mixed: Root = {
      name: 'x',
      children: [
        page('a', { badge: { label: '已上线', color: '#111' } }),
        page('b', { badge: { label: '已上线', color: '#222' } }),
        page('c', { badge: { label: '已上线' } }),
      ],
    };
    const opts = collectSidebarBadges(mixed);
    assert.equal(opts[0]?.color, '#111');
    assert.equal(opts[0]?.count, 3);
  });
});

describe('folderHasBadge / nodePassesBadge', () => {
  it('passes all nodes when filter is null', () => {
    const qianniu = tree.children[1] as Folder;
    assert.equal(folderHasBadge(qianniu, null), true);
    assert.equal(nodePassesBadge(qianniu.children[2] as Item, null), true);
  });

  it('keeps ancestor folders that have a matching descendant', () => {
    const qianniu = tree.children[1] as Folder;
    assert.equal(folderHasBadge(qianniu, '已上线'), true);
    assert.equal(folderHasBadge(qianniu, '待上线'), true);
    assert.equal(folderHasBadge(qianniu, '不存在'), false);
    assert.equal(nodePassesBadge(qianniu.children[0] as Item, '已上线'), true);
    assert.equal(nodePassesBadge(qianniu.children[1] as Item, '已上线'), false);
  });
});

describe('collectMatchIds with badge filter', () => {
  it('intersects search text with badge label', () => {
    const all = collectMatchIds(tree, 'rpa.conn');
    assert.equal(all.length, 4);

    const online = collectMatchIds(tree, 'rpa.conn', '已上线');
    assert.deepEqual(
      online.map((id) => id.replace(/^page:/, '')),
      ['/docs/账单', '/docs/订单'],
    );
  });
});
