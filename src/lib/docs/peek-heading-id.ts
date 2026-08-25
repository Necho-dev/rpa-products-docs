/** 右栏标题 id 前缀，避免与左栏相同 heading 抢 document.getElementById。 */
export const PEEK_HEADING_ID_PREFIX = 'peek--';

export function scopedHeadingId(id: string, prefix: string): string {
  if (!id || id.startsWith(prefix)) return id;
  return `${prefix}${id}`;
}

export function peekHeadingId(id: string): string {
  return scopedHeadingId(id, PEEK_HEADING_ID_PREFIX);
}

export function peekTocHref(url: string): string {
  if (!url.startsWith('#')) return url;
  return `#${peekHeadingId(url.slice(1))}`;
}

export function scopedTocHref(url: string, prefix: string): string {
  if (!url.startsWith('#')) return url;
  return `#${scopedHeadingId(url.slice(1), prefix)}`;
}

/**
 * 内联 preview 用的标题前缀：同一页可能嵌多篇，必须按目标 URL 区分。
 * 形态 `ref-<slug>--`，与 `peek--` 一样以 `--` 收尾，方便剥离。
 */
export function referencePreviewHeadingPrefix(url: string): string {
  const slug = url
    .replace(/^\/docs\/?/u, '')
    .replace(/[^A-Za-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(-48);
  return `ref-${slug || 'doc'}--`;
}

export function applyHeadingScope(
  root: ParentNode,
  tocIds: readonly string[],
  prefix: string,
): void {
  const ids = new Set(tocIds.filter(Boolean));
  if (ids.size === 0) return;

  const nodes = root.querySelectorAll<HTMLElement>('[id]');
  for (const el of nodes) {
    if (!ids.has(el.id)) continue;
    el.id = scopedHeadingId(el.id, prefix);
  }

  const links = root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.startsWith(`#${prefix}`)) continue;
    const id = href.slice(1);
    try {
      if (ids.has(decodeURIComponent(id)) || ids.has(id)) {
        link.setAttribute('href', scopedTocHref(href, prefix));
      }
    } catch {
      if (ids.has(id)) link.setAttribute('href', scopedTocHref(href, prefix));
    }
  }
}

export function applyPeekHeadingScope(root: ParentNode, tocIds: readonly string[]): void {
  applyHeadingScope(root, tocIds, PEEK_HEADING_ID_PREFIX);
}
