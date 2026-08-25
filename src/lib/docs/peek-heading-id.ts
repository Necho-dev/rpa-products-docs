/** 右栏标题 id 前缀，避免与左栏相同 heading 抢 document.getElementById。 */
export const PEEK_HEADING_ID_PREFIX = 'peek--';

export function peekHeadingId(id: string): string {
  if (!id || id.startsWith(PEEK_HEADING_ID_PREFIX)) return id;
  return `${PEEK_HEADING_ID_PREFIX}${id}`;
}

export function peekTocHref(url: string): string {
  if (!url.startsWith('#')) return url;
  return `#${peekHeadingId(url.slice(1))}`;
}

export function applyPeekHeadingScope(root: ParentNode, tocIds: readonly string[]): void {
  const ids = new Set(tocIds.filter(Boolean));
  if (ids.size === 0) return;

  const nodes = root.querySelectorAll<HTMLElement>('[id]');
  for (const el of nodes) {
    if (!ids.has(el.id)) continue;
    el.id = peekHeadingId(el.id);
  }

  const links = root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.startsWith(`#${PEEK_HEADING_ID_PREFIX}`)) continue;
    const id = href.slice(1);
    try {
      if (ids.has(decodeURIComponent(id)) || ids.has(id)) {
        link.setAttribute('href', peekTocHref(href));
      }
    } catch {
      if (ids.has(id)) link.setAttribute('href', peekTocHref(href));
    }
  }
}
