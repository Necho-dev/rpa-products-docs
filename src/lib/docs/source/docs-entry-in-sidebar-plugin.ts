import type { Folder, Item } from 'fumadocs-core/page-tree';
import type { ContentStorage, LoaderPlugin, PageTreeBuilderContext } from 'fumadocs-core/source';

export type DocBadge = { label: string; color?: string };

type PageFrontmatterExtras = {
  entry?: string;
  badge?: DocBadge;
  sidebarFolderLink?: boolean;
};

/** 侧栏树节点上的扩展字段（非 fumadocs-core 类型声明的一部分，运行时可附加） */
export type SidebarItemWithBadge = Item & { badge?: DocBadge };
export type SidebarFolderWithBadge = Folder & {
  badge?: DocBadge;
  /** false：侧栏文件夹标题只折叠，不导航到 index */
  folderLink?: boolean;
};

/**
 * 将页面 frontmatter 中的 `entry`（技术入口 / Code，如 rpa.conn.*）挂到侧栏树节点的 `description`；
 * 将 `badge` 挂到节点上供侧栏标题行右侧展示。
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
        const data = file.data as PageFrontmatterExtras;
        const entry = data.entry;
        const badge = data.badge;
        return {
          ...node,
          description: entry != null && entry !== '' ? String(entry) : undefined,
          ...(badge ? { badge } : {}),
        } as Item;
      },
      folder(this: PageTreeBuilderContext<ContentStorage>, node: Folder, folderPath: string) {
        const indexKey = folderPath ? `${folderPath}/index` : 'index';
        const indexPath = this.builder.resolveFlattenPath(indexKey, 'page');
        const file = this.storage.read(indexPath);
        if (!file || file.format !== 'page') return node;
        const data = file.data as PageFrontmatterExtras;
        const entry = data.entry;
        const badge = data.badge;
        return {
          ...node,
          ...(entry != null && entry !== '' ? { description: String(entry) } : {}),
          ...(badge ? { badge } : {}),
          ...(data.sidebarFolderLink === false ? { folderLink: false } : {}),
        } as Folder;
      },
    },
  };
}
