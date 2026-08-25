/** 可见栏宽：须能同时放下约 36rem 正文 + 12.5rem 完整目录才展开。 */
export const TOC_COMPACT_MAX_PX = 64 * 16;
/** 钉钉大纲收起轨 56px；布局只占这一列，hover 浮层不改网格。 */
export const TOC_COMPACT_WIDTH = '3.5rem';
export const TOC_FULL_WIDTH = '12.5rem';
/** hover 浮层按内容撑开，上限避免长标题占满栏。 */
export const TOC_OVERLAY_MIN_WIDTH = '12.5rem';
export const TOC_OVERLAY_MAX_WIDTH = '20rem';
const TOC_FULL_PX = 12.5 * 16;
const TOC_RAIL_PX = 3.5 * 16;
/** 折叠会把目录列从 12.5rem 收到 3.5rem，正文变宽；退出折叠要比进入阈值更宽，避免来回跳。 */
export const TOC_COMPACT_EXIT_PX = TOC_COMPACT_MAX_PX + (TOC_FULL_PX - TOC_RAIL_PX);

export function isCompactPaneWidth(widthPx: number, currentlyCompact = false): boolean {
  if (widthPx <= 0) return false;
  if (currentlyCompact) return widthPx < TOC_COMPACT_EXIT_PX;
  return widthPx < TOC_COMPACT_MAX_PX;
}

/**
 * 测「正文+目录」占用的稳定宽度，而不是会被 --fd-toc-width 改掉的 #nd-page 单盒。
 * 双栏左栏用分隔线到左缘的距离（目录叠在正文上，不重复计入）。
 *
 * 折叠样式必须由 #nd-notebook-layout[data-toc-compact-left] 驱动：
 * #nd-toc 会随文档路由整节点替换，只打在旧节点上会留下 3.5rem 栏宽 + 完整文字。
 */
export function measureVisiblePaneWidth(side: 'left' | 'right'): number {
  if (typeof document === 'undefined') return 0;
  const page = document.getElementById('nd-page');
  const peek = document.querySelector('[data-doc-peek-panel]');
  const toc = document.getElementById('nd-toc');
  const peekVisible =
    peek instanceof HTMLElement && peek.offsetParent !== null && peek.getBoundingClientRect().width > 48;

  if (side === 'right') {
    return peekVisible ? peek.getBoundingClientRect().width : 0;
  }
  if (!page) return 0;
  const pageRect = page.getBoundingClientRect();
  if (peekVisible && peek instanceof HTMLElement) {
    const gap = peek.getBoundingClientRect().left - pageRect.left;
    if (gap > 48) return gap;
  }
  if (toc instanceof HTMLElement && toc.offsetParent !== null) {
    const tocRect = toc.getBoundingClientRect();
    return Math.max(pageRect.right, tocRect.right) - pageRect.left;
  }
  return pageRect.width;
}
