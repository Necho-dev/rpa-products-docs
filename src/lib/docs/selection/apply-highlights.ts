import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

type TextNodeEntry = { node: Text; start: number; end: number };
type CharMap = { node: Text; offset: number };

function buildTextNodeMap(root: HTMLElement): { raw: string; nodes: TextNodeEntry[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: TextNodeEntry[] = [];
  let raw = '';
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    if (!node.nodeValue) continue;
    const parent = node.parentElement;
    if (parent?.closest('[data-doc-highlight]')) continue;
    if (parent?.closest('pre, script, style, button, input, textarea, select, [data-no-select]')) continue;

    const start = raw.length;
    raw += node.nodeValue;
    nodes.push({ node, start, end: raw.length });
  }

  return { raw, nodes };
}

function charAtRaw(nodes: TextNodeEntry[], index: number): CharMap | null {
  for (const entry of nodes) {
    if (index >= entry.start && index < entry.end) {
      return { node: entry.node, offset: index - entry.start };
    }
  }
  return null;
}

/** 构建与 extractTextQuote 一致的空格归一化文本及字符映射 */
function buildNormalizedMap(root: HTMLElement): { normalized: string; map: CharMap[] } {
  const { raw, nodes } = buildTextNodeMap(root);
  const map: CharMap[] = [];
  let normalized = '';
  let pendingSpace = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (/\s/.test(ch)) {
      if (normalized.length > 0) pendingSpace = true;
      continue;
    }
    if (pendingSpace) {
      normalized += ' ';
      const prev = charAtRaw(nodes, i - 1) ?? charAtRaw(nodes, i);
      if (prev) map.push(prev);
      pendingSpace = false;
    }
    normalized += ch;
    const mapped = charAtRaw(nodes, i);
    if (mapped) map.push(mapped);
  }

  return { normalized, map };
}

function findQuoteInNormalized(
  normalized: string,
  quote: Pick<DocHighlight, 'exact' | 'prefix' | 'suffix'>,
): number | null {
  const exact = normalizeText(quote.exact);
  if (!exact) return null;

  let searchFrom = 0;
  while (searchFrom < normalized.length) {
    const pos = normalized.indexOf(exact, searchFrom);
    if (pos === -1) return null;

    const before = normalized.slice(Math.max(0, pos - quote.prefix.length), pos);
    const after = normalized.slice(pos + exact.length, pos + exact.length + quote.suffix.length);

    const prefixOk =
      !quote.prefix || before.endsWith(quote.prefix) || quote.prefix.endsWith(before);
    const suffixOk =
      !quote.suffix || after.startsWith(quote.suffix) || quote.suffix.startsWith(after);

    if (prefixOk && suffixOk) return pos;
    searchFrom = pos + 1;
  }

  return null;
}

function createHighlightSpan(highlightId: string, color: DocHighlight['color']): HTMLSpanElement {
  const span = document.createElement('span');
  span.dataset.docHighlight = highlightId;
  span.dataset.highlightColor = color;
  span.className = 'doc-highlight-mark';
  return span;
}

function wrapTextNodeRange(
  textNode: Text,
  startOffset: number,
  endOffset: number,
  highlightId: string,
  color: DocHighlight['color'],
): boolean {
  if (startOffset >= endOffset) return false;
  const range = document.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);
  const span = createHighlightSpan(highlightId, color);
  try {
    range.surroundContents(span);
    return true;
  } catch {
    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      return true;
    } catch {
      return false;
    }
  }
}

/** 用选区 Range 直接包裹高亮，支持跨 inline 元素 */
export function wrapHighlightRange(
  range: Range,
  highlight: Pick<DocHighlight, 'id' | 'color'>,
): boolean {
  const clone = range.cloneRange();
  if (clone.collapsed) return false;

  const startContainer = clone.startContainer;
  const endContainer = clone.endContainer;
  const startOffset = clone.startOffset;
  const endOffset = clone.endOffset;

  try {
    const span = createHighlightSpan(highlight.id, highlight.color);
    clone.surroundContents(span);
    return true;
  } catch {
    // 跨节点：逐文本节点包裹，共用同一 highlight id
  }

  const walker = document.createTreeWalker(
    clone.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue?.length) return NodeFilter.FILTER_REJECT;
        if (!clone.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (parent?.closest('[data-doc-highlight], pre, button, input, textarea, select, [data-no-select]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const segments: { node: Text; start: number; end: number }[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const textNode = n as Text;
    const segStart = textNode === startContainer ? startOffset : 0;
    const segEnd =
      textNode === endContainer ? endOffset : (textNode.nodeValue?.length ?? 0);
    if (segStart < segEnd) segments.push({ node: textNode, start: segStart, end: segEnd });
  }

  if (segments.length === 0) return false;

  let wrapped = false;
  for (const { node, start, end } of segments) {
    if (wrapTextNodeRange(node, start, end, highlight.id, highlight.color)) {
      wrapped = true;
    }
  }

  return wrapped;
}

function rangeFromNormalizedSpan(
  map: CharMap[],
  start: number,
  end: number,
): Range | null {
  if (start < 0 || end > map.length || start >= end) return null;
  const startMap = map[start];
  const endMap = map[end - 1];
  if (!startMap || !endMap) return null;

  const range = document.createRange();
  range.setStart(startMap.node, startMap.offset);
  const endOffset =
    startMap.node === endMap.node ? endMap.offset + 1 : endMap.offset + 1;
  range.setEnd(endMap.node, endOffset);
  return range;
}

export function applyHighlightToDom(
  container: HTMLElement,
  highlight: DocHighlight,
  appliedIds: Set<string>,
): boolean {
  if (appliedIds.has(highlight.id)) return false;
  if (container.querySelector(`[data-doc-highlight="${highlight.id}"]`)) {
    appliedIds.add(highlight.id);
    return false;
  }

  const { normalized, map } = buildNormalizedMap(container);
  const pos = findQuoteInNormalized(normalized, highlight);
  if (pos === null) return false;

  const exactLen = normalizeText(highlight.exact).length;
  const range = rangeFromNormalizedSpan(map, pos, pos + exactLen);
  if (!range) return false;

  const ok = wrapHighlightRange(range, highlight);
  if (ok) appliedIds.add(highlight.id);
  return ok;
}

export function applyHighlightsToContainer(
  container: HTMLElement,
  highlights: DocHighlight[],
): void {
  const appliedIds = new Set<string>();
  for (const h of highlights) {
    applyHighlightToDom(container, h, appliedIds);
  }
}

export function applyHighlightFromRange(
  container: HTMLElement,
  highlight: DocHighlight,
  range?: Range,
): boolean {
  if (range) {
    return wrapHighlightRange(range, highlight);
  }
  return applyHighlightToDom(container, highlight, new Set());
}

export function unwrapHighlightMark(mark: Element): void {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  mark.remove();
}

/** 同一 highlight id 的所有 DOM 片段（按文档顺序） */
export function collectHighlightSegments(highlightId: string, root?: ParentNode): HTMLElement[] {
  const scope = root ?? document;
  return Array.from(scope.querySelectorAll<HTMLElement>(`[data-doc-highlight="${highlightId}"]`));
}

export function getHighlightUnionRect(elements: HTMLElement[]): DOMRect {
  if (elements.length === 0) {
    return new DOMRect(0, 0, 0, 0);
  }
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return new DOMRect(left, top, right - left, bottom - top);
}

export function getHighlightCombinedText(elements: HTMLElement[]): string {
  return elements.map((el) => el.textContent ?? '').join('');
}

export function rangeFromHighlightSegments(segments: HTMLElement[]): Range | null {
  if (segments.length === 0) return null;
  const range = document.createRange();
  range.setStartBefore(segments[0]);
  range.setEndAfter(segments[segments.length - 1]);
  return range;
}
