/** 文档页主内容根节点（含标题、MDX 正文、not-prose 组件块） */
export const DOCS_PAGE_SELECTOR = '#nd-page';

const INTERACTIVE_SELECTOR =
  'button, input, textarea, select, [role="button"], [contenteditable="true"]';

export type SelectionSnapshot = {
  text: string;
  rect: DOMRect;
  range: Range;
  exact: string;
  prefix: string;
  suffix: string;
  sameBlock: boolean;
};

export function findProseContainer(): HTMLElement | null {
  return findDocsContentRoot();
}

export function findDocsContentRoot(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(DOCS_PAGE_SELECTOR)
    ?? document.querySelector<HTMLElement>('#nd-docs-layout article')
    ?? document.querySelector<HTMLElement>('#nd-docs-layout article .prose')
    ?? document.querySelector<HTMLElement>('article .prose')
  );
}

function nodeInContainer(node: Node, container: Node): boolean {
  return container.contains(node);
}

function parentElementOf(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function isInside(node: Node, selector: string): boolean {
  const el = parentElementOf(node);
  return Boolean(el?.closest(selector));
}

/** 选区起止点是否落在不可选区域（仅检查端点，避免误伤表格/跨 inline 元素选区） */
function rangeEndpointsBlocked(range: Range): boolean {
  const points = [range.startContainer, range.endContainer];
  for (const point of points) {
    if (isInside(point, `[data-no-select], pre, ${INTERACTIVE_SELECTOR}`)) return true;
  }
  return false;
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractTextQuote(container: HTMLElement, range: Range): {
  exact: string;
  prefix: string;
  suffix: string;
} {
  const exact = normalizeSpaces(range.toString());

  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const prefix = preRange.toString().replace(/\s+/g, ' ').slice(-32);

  const postRange = document.createRange();
  postRange.selectNodeContents(container);
  postRange.setStart(range.endContainer, range.endOffset);
  const suffix = postRange.toString().replace(/\s+/g, ' ').slice(0, 32);

  return { exact, prefix, suffix };
}

function getBlockElement(node: Node): Element | null {
  const el = parentElementOf(node);
  return el?.closest(
    'p, li, td, th, blockquote, h1, h2, h3, h4, h5, h6, figcaption, div',
  ) ?? null;
}

export function isSameBlockRange(range: Range): boolean {
  const startBlock = getBlockElement(range.startContainer);
  const endBlock = getBlockElement(range.endContainer);
  return Boolean(startBlock && endBlock && startBlock === endBlock);
}

export function readSelectionInContainer(container: HTMLElement | null): SelectionSnapshot | null {
  if (!container) return null;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (
    !nodeInContainer(range.startContainer, container)
    || !nodeInContainer(range.endContainer, container)
  ) {
    return null;
  }

  if (rangeEndpointsBlocked(range)) return null;

  const text = normalizeSpaces(range.toString());
  if (text.length < 2 || text.length > 2000) return null;

  const { exact, prefix, suffix } = extractTextQuote(container, range);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  return {
    text,
    rect,
    range: range.cloneRange(),
    exact,
    prefix,
    suffix,
    sameBlock: isSameBlockRange(range),
  };
}

export function clearNativeSelection(): void {
  window.getSelection()?.removeAllRanges();
}
