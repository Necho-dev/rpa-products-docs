/** 章节锚点滚动：与摘录定位相同，使用 smooth，并滚对栏内滚动容器。 */

/** 标题与吸顶栏（或栏内顶部）之间的空隙 */
const STICKY_GAP_PX = 12;

export function prefersReducedMotion(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

export function hashIdFromHref(href: string, pageUrl?: string): string | null {
  if (!href || href === '#') return null;
  try {
    const url = new URL(href, pageUrl ?? 'http://local.invalid/');
    const raw = url.hash.replace(/^#/, '');
    if (!raw || raw.includes(':~:text=')) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  } catch {
    if (!href.startsWith('#')) return null;
    const raw = href.slice(1);
    if (!raw || raw.includes('/')) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
}

function matchIdInRoot(id: string, root: ParentNode): HTMLElement | null {
  if (typeof document !== 'undefined' && root === document) {
    return document.getElementById(id);
  }
  const children = root.querySelectorAll<HTMLElement>('[id]');
  for (const el of children) {
    if (el.id === id) return el;
  }
  return null;
}

export function findAnchorInRoot(id: string, root: ParentNode): HTMLElement | null {
  if (!id) return null;
  const direct = matchIdInRoot(id, root);
  if (direct) return direct;
  if (id.startsWith('peek--')) return matchIdInRoot(id.slice('peek--'.length), root);
  return matchIdInRoot(`peek--${id}`, root);
}

function isScrollableBox(el: HTMLElement): boolean {
  const { overflowY } = window.getComputedStyle(el);
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
    return false;
  }
  return el.scrollHeight > el.clientHeight + 1;
}

/** 从节点向上找实际在滚的容器；双栏时通常是 `#nd-page` 或 `[data-doc-peek-scroll]`。 */
export function findScrollParent(el: HTMLElement): HTMLElement | Window {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollableBox(node)) return node;
    node = node.parentElement;
  }
  return window;
}

/**
 * 按点击来源锁定滚动根，避免左右栏出现相同 heading id 时滚错文章。
 */
export function getAnchorScrollRoot(from: Element): HTMLElement | Window {
  const peekScroll = from.closest<HTMLElement>('[data-doc-peek-scroll]');
  if (peekScroll) return peekScroll;

  const peekPanel = from.closest('[data-doc-peek-panel]');
  const peekFromToc = peekPanel?.querySelector<HTMLElement>('[data-doc-peek-scroll]');
  if (peekFromToc) return peekFromToc;

  const page = document.getElementById('nd-page');
  if (page && isScrollableBox(page)) return page;
  return window;
}

function isWindowRoot(root: HTMLElement | Window): root is Window {
  return root === window;
}

/**
 * 视口滚动时正文会钻进 sticky `#nd-subnav`；栏内滚动（`#nd-page` / peek）已经在顶栏下方，只需留空隙。
 */
export function getStickyOverlapOffset(container: HTMLElement | Window): number {
  if (!isWindowRoot(container)) return STICKY_GAP_PX;
  const header = document.getElementById('nd-subnav');
  if (header) {
    const rect = header.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    if (overlap > 0) return overlap + STICKY_GAP_PX;
  }
  return STICKY_GAP_PX;
}

export function resetDocsScrollToTop(): void {
  const instant = 'instant' as ScrollBehavior;
  window.scrollTo({ top: 0, left: 0, behavior: instant });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const page = document.getElementById('nd-page');
  if (page) page.scrollTo({ top: 0, behavior: instant });
}

export function getAnchorQueryRoot(scrollRoot: HTMLElement | Window): ParentNode {
  if (isWindowRoot(scrollRoot)) {
    return document.getElementById('nd-page') ?? document;
  }
  return scrollRoot;
}

export function smoothScrollToElement(
  el: HTMLElement,
  options?: { block?: 'start' | 'center'; offset?: number; container?: HTMLElement | Window },
): void {
  const behavior = scrollBehavior();
  const block = options?.block ?? 'start';
  const container = options?.container ?? findScrollParent(el);
  const offset = options?.offset ?? getStickyOverlapOffset(container);

  if (isWindowRoot(container)) {
    if (block === 'center') {
      const rect = el.getBoundingClientRect();
      const top =
        window.scrollY + rect.top - window.innerHeight / 2 + Math.max(rect.height, 24) / 2;
      window.scrollTo({ top: Math.max(0, top), behavior });
      return;
    }
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({ top, behavior });
    return;
  }

  const box = container;
  const elRect = el.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  const nextTop =
    block === 'center'
      ? box.scrollTop + (elRect.top - boxRect.top) - box.clientHeight / 2 + elRect.height / 2
      : box.scrollTop + (elRect.top - boxRect.top) - offset;
  box.scrollTo({ top: Math.max(0, nextTop), behavior });
}

export function smoothScrollRectIntoView(
  rect: DOMRect,
  from: HTMLElement,
  block: 'start' | 'center' = 'center',
): void {
  const behavior = scrollBehavior();
  const container = findScrollParent(from);

  if (isWindowRoot(container)) {
    const targetY =
      block === 'center'
        ? window.scrollY + rect.top - window.innerHeight / 2 + Math.max(rect.height, 24) / 2
        : window.scrollY + rect.top - getStickyOverlapOffset(window);
    window.scrollTo({ top: Math.max(0, targetY), behavior });
    return;
  }

  const boxRect = container.getBoundingClientRect();
  const nextTop =
    block === 'center'
      ? container.scrollTop + (rect.top - boxRect.top) - container.clientHeight / 2 + Math.max(rect.height, 24) / 2
      : container.scrollTop + (rect.top - boxRect.top) - getStickyOverlapOffset(container);
  container.scrollTo({ top: Math.max(0, nextTop), behavior });
}

export function samePathname(a: string, b: string): boolean {
  const norm = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p) || '/';
  return norm(a) === norm(b);
}

/** 拦截目录/正文锚点点击：阻止瞬时跳转，平滑滚到对应标题。Peek 内不改地址栏。 */
export function handleDocsAnchorClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const target = event.target;
  if (!target || (target as Node).nodeType !== 1) return false;

  const anchor = (target as Element).closest('a[href]');
  if (!anchor || anchor.tagName !== 'A') return false;
  if (
    !anchor.closest(
      '#nd-toc, [data-toc-popover], [data-doc-peek-toc], #nd-page, [data-doc-peek-scroll]',
    )
  ) {
    return false;
  }

  const href = anchor.getAttribute('href');
  if (!href) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  const id = hashIdFromHref(href, window.location.href);
  if (!id) return false;

  const inPeek = Boolean(
    anchor.closest('[data-doc-peek-toc], [data-doc-peek-scroll], [data-doc-peek-panel]'),
  );
  const samePage = samePathname(url.pathname, window.location.pathname);
  if (!samePage && !inPeek) return false;

  const scrollRoot = getAnchorScrollRoot(anchor);
  const queryRoot = getAnchorQueryRoot(scrollRoot);
  const heading = findAnchorInRoot(id, queryRoot);
  if (!heading) return false;

  event.preventDefault();

  if (samePage && !inPeek) {
    const next = `${window.location.pathname}${window.location.search}${url.hash}`;
    if (window.location.hash !== url.hash) {
      history.pushState(null, '', next);
    } else {
      history.replaceState(null, '', next);
    }
  }

  smoothScrollToElement(heading, { container: scrollRoot, block: 'start' });
  return true;
}
