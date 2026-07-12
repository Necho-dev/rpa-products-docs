import type { Folder, Item, Separator } from 'fumadocs-core/page-tree';
import type { ContentStorage, LoaderPlugin } from 'fumadocs-core/source';
import { resolveDocIcon, bitmapIconElement } from '@/lib/docs/icons/index';

export { resolveDocIcon, bitmapIconElement };

type TreeNode = Item | Separator;

function replaceIcon<T extends TreeNode>(node: T): T {
  if (node.icon === undefined || typeof node.icon === 'string') {
    return {
      ...node,
      icon: resolveDocIcon(
        typeof node.icon === 'string' ? node.icon : undefined,
      ),
    };
  }
  return node;
}

/**
 * Fumadocs loader plugin：将页面树中字符串 icon 统一解析。
 * 支持 platform icons / shared icons / Lucide，folder 节点额外读取 meta.json `color`。
 */
export function docIconsPlugin(): LoaderPlugin<ContentStorage> {
  return {
    name: 'docus:doc-icons',
    transformPageTree: {
      file: replaceIcon,
      separator: replaceIcon,
      folder(node, _folderPath, metaPath) {
        if (node.icon !== undefined && typeof node.icon !== 'string') return node;

        const iconName = typeof node.icon === 'string' ? node.icon : undefined;
        let color: string | undefined;

        if (metaPath) {
          const metaFile = this.storage.read(metaPath);
          if (metaFile && metaFile.format === 'meta') {
            color = (metaFile.data as { color?: string }).color;
          }
        }

        return { ...node, icon: resolveDocIcon(iconName, color) };
      },
    },
  };
}
