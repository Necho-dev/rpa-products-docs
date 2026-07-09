import { createElement, type ReactElement } from 'react';
import { icons } from 'lucide-react';
import type { Folder, Item, Separator } from 'fumadocs-core/page-tree';
import type { ContentStorage, LoaderPlugin } from 'fumadocs-core/source';
import { getCachedPlatformIconByCode } from '@/lib/docs/platform-favicon/manifest-store';

function platformFaviconElement(src: string): ReactElement {
  // 固定外框 + 尺寸，避免位图撑开侧栏行、挤压标题（Lucide 由 [&_svg]:size-4 约束）
  return createElement(
    'span',
    {
      className:
        'inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-fd-border/80 bg-fd-card p-px',
      'aria-hidden': true,
    },
    createElement('img', {
      src,
      alt: '',
      width: 14,
      height: 14,
      className: 'size-full object-contain',
      referrerPolicy: 'no-referrer',
    }),
  );
}

/**
 * 解析 frontmatter / meta `icon`：
 * 1. manifest codes（如 `RPA_QIANNIU`、`TAOBAO`）→ 站内平台 favicon
 * 2. 其余 → Lucide 图标名（与官方 lucideIconsPlugin 一致）
 */
export function resolveDocIcon(icon: string | undefined): ReactElement | undefined {
  if (icon === undefined) return undefined;

  const platformSrc = getCachedPlatformIconByCode(icon);
  if (platformSrc) {
    return platformFaviconElement(platformSrc);
  }

  const Icon = icons[icon as keyof typeof icons];
  if (!Icon) {
    console.warn(`[doc-icons] Unknown icon (not in platform favicons or Lucide): ${icon}`);
    return undefined;
  }
  return createElement(Icon);
}

type TreeNode = Item | Folder | Separator;

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
 * 替代 `lucideIconsPlugin`：支持 `icon: RPA_QIANNIU` 与 Lucide 名混用。
 */
export function docIconsPlugin(): LoaderPlugin<ContentStorage> {
  return {
    name: 'docus:doc-icons',
    transformPageTree: {
      file: replaceIcon,
      folder: replaceIcon,
      separator: replaceIcon,
    },
  };
}
