import { findPath } from 'fumadocs-core/page-tree';
import type { Folder } from 'fumadocs-core/page-tree';
import type { Root } from 'fumadocs-core/page-tree';
import { source } from '@/lib/source';

function normalizeHref(url: string): string {
  let p = url.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function metaIsPrivate(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'access' in data &&
    (data as { access?: string }).access === 'private'
  );
}

function rootMetaPrivate(tree: Root): boolean {
  const rootMeta = source.getNodeMeta(tree);
  return rootMeta?.data ? metaIsPrivate(rootMeta.data) : false;
}

/** 页面 URL 路径上是否存在将内容标为私有的目录（或根）meta */
export function folderMetaImpliesPrivateDocs(pageUrl: string): boolean {
  const tree = source.getPageTree();
  if (rootMetaPrivate(tree)) return true;

  const target = normalizeHref(pageUrl);
  const chain = findPath(tree.children, (node) => {
    if (node.type !== 'page') return false;
    return normalizeHref(node.url) === target;
  });

  if (!chain) return false;

  for (const node of chain) {
    if (node.type !== 'folder') continue;
    const meta = source.getNodeMeta(node as Folder);
    if (meta?.data && metaIsPrivate(meta.data)) return true;
  }

  return false;
}

/**
 * 合并正文 frontmatter 与目录 meta：
 * - `access: public` | `access: private` 显式写在页面则优先；
 * - 否则若任一层级目录（或根）meta 为 `access: private`，则视为私有；
 * - 其余为 public。
 */
export function getEffectiveDocAccess(page: {
  data: { access?: string };
  url: string;
}): 'public' | 'private' {
  const explicit = page.data.access;
  if (explicit === 'public') return 'public';
  if (explicit === 'private') return 'private';
  if (folderMetaImpliesPrivateDocs(page.url)) return 'private';
  return 'public';
}
