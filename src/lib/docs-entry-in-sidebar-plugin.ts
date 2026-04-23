import type { Folder, Item } from 'fumadocs-core/page-tree';
import type { ContentStorage, LoaderPlugin, PageTreeBuilderContext } from 'fumadocs-core/source';

/**
 * 将页面 frontmatter 中的 `entry`（技术入口 / Code，如 rpa.conn.*）挂到侧栏树节点的 `description`；
 * 页面正文仍用 `title` + `description`，站点 URL 仍由文件路径/slug 决定。
 * 对叶子页：用 `entry` 覆盖树节点内的 description，避免把 SEO 的 `description` 误显到侧栏。
 */
export function docsEntryInSidebarPlugin(): LoaderPlugin<ContentStorage> {
  return {
    name: 'docus:entry-in-sidebar',
    transformPageTree: {
      file(this: PageTreeBuilderContext<ContentStorage>, node: Item, filePath?: string) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (!file || file.format !== 'page') return node;
        const data = file.data as { entry?: string };
        const entry = data.entry;
        if (entry) {
          return { ...node, description: String(entry) };
        }
        return { ...node, description: undefined };
      },
      folder(this: PageTreeBuilderContext<ContentStorage>, node: Folder, folderPath: string) {
        const indexKey = folderPath ? `${folderPath}/index` : 'index';
        const indexPath = this.builder.resolveFlattenPath(indexKey, 'page');
        const file = this.storage.read(indexPath);
        if (!file || file.format !== 'page') return node;
        const data = file.data as { entry?: string };
        const entry = data.entry;
        if (entry) {
          return { ...node, description: String(entry) };
        }
        return node;
      },
    },
  };
}
