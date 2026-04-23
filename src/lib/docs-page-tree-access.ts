import type { Folder, Item, Node, Root } from 'fumadocs-core/page-tree';
import type { DocAccessContext } from '@/lib/doc-access';
import { isDocPageAccessible, resolveDocPage } from '@/lib/docs-site-tools';

function itemVisible(url: string, ctx: DocAccessContext): boolean {
  const page = resolveDocPage(url);
  if (!page) return true;
  return isDocPageAccessible(page, ctx);
}

function filterFolder(node: Folder, ctx: DocAccessContext): Folder | null {
  const children = filterNodes(node.children, ctx);

  let index: Item | undefined = node.index;
  if (index && !itemVisible(index.url, ctx)) {
    index = undefined;
  }

  if (children.length === 0 && index === undefined) {
    return null;
  }

  return { ...node, children, index };
}

function filterNodes(nodes: Node[], ctx: DocAccessContext): Node[] {
  const out: Node[] = [];
  for (const node of nodes) {
    const next = filterNode(node, ctx);
    if (next !== null) out.push(next);
  }
  return out;
}

function filterNode(node: Node, ctx: DocAccessContext): Node | null {
  if (node.type === 'separator') {
    return node;
  }

  if (node.type === 'page') {
    return itemVisible(node.url, ctx) ? node : null;
  }

  if (node.type === 'folder') {
    return filterFolder(node, ctx);
  }

  return node;
}

/** 在未持有私有权限时从侧栏移除 `access: private` 对应的页面及空文件夹 */
export function filterPageTreeForAccess(root: Root, ctx: DocAccessContext): Root {
  const filtered: Root = {
    ...root,
    children: filterNodes(root.children, ctx),
  };

  if (root.fallback) {
    filtered.fallback = filterPageTreeForAccess(root.fallback, ctx);
  }

  return filtered;
}
