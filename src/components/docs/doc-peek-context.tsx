'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from 'fumadocs-ui/layouts/notebook/slots/sidebar';
import {
  canonicalDocsHref,
  DEFAULT_PEEK_RATIO,
  isSameDocsPage,
  parsePeekTarget,
  writePeekCookie,
  type DocPeekTarget,
} from '@/lib/docs/doc-peek';
import { classifyLink, docsPathAndHashFromHref, isPureHashHref, stripTrailingSlash } from '@/lib/docs/link-kind';
import {
  findAnchorInRoot,
  getAnchorScrollRoot,
  smoothScrollToElement,
} from '@/lib/docs/smooth-scroll-to-anchor';
import { type DocPeekSurface } from '@/components/docs/doc-peek-surface';

export type { DocPeekSurface } from '@/components/docs/doc-peek-surface';
export { DocPeekSurfaceProvider, useDocPeekSurface } from '@/components/docs/doc-peek-surface';

const XL_QUERY = '(min-width: 1280px)';

function subscribeXl(onChange: () => void) {
  const mq = window.matchMedia(XL_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getXlSnapshot() {
  return window.matchMedia(XL_QUERY).matches;
}

function getXlServerSnapshot() {
  return false;
}

export type DocPeekContextValue = {
  open: boolean;
  desktop: boolean;
  target: DocPeekTarget | null;
  blankSplit: boolean;
  peekRatio: number;
  setPeekRatio: (ratio: number) => void;
  splitDragging: boolean;
  setSplitDragging: (dragging: boolean) => void;
  canPeekBack: boolean;
  canPeekForward: boolean;
  pinned: boolean;
  togglePeekPin: () => void;
  openPeek: (href: string, from?: DocPeekSurface) => void;
  hydrate: (target: DocPeekTarget) => void;
  openSplitView: () => void;
  closePeek: () => void;
  openFullPage: (href?: string) => void;
  refreshPeek: () => void;
  peekBack: () => void;
  peekForward: () => void;
  pending: boolean;
};

const DocPeekContext = createContext<DocPeekContextValue | null>(null);

export function useDocPeek(): DocPeekContextValue | null {
  return use(DocPeekContext);
}

type StackState = { entries: DocPeekTarget[]; index: number };

function stackFromTarget(target: DocPeekTarget | null): StackState {
  if (!target) return { entries: [], index: -1 };
  return { entries: [target], index: 0 };
}

export function DocPeekProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const desktop = useSyncExternalStore(subscribeXl, getXlSnapshot, getXlServerSnapshot);
  const [peekRatio, setPeekRatio] = useState(DEFAULT_PEEK_RATIO);
  const [splitDragging, setSplitDragging] = useState(false);
  const [stack, setStack] = useState<StackState>({ entries: [], index: -1 });
  const [pinned, setPinned] = useState(false);
  const [blankSplit, setBlankSplit] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathnameRef = useRef(pathname);
  const pinnedRef = useRef(false);
  const openRef = useRef(false);
  const openPeekRef = useRef<(href: string, from?: DocPeekSurface) => void>(() => {});
  const openFullPageRef = useRef<(href?: string) => void>(() => {});
  const lastTargetRef = useRef<DocPeekTarget | null>(null);
  const leftScrollRef = useRef(0);
  const sidebar = useSidebar();
  const setCollapsed = sidebar.setCollapsed;
  const collapsed = sidebar.collapsed;
  const collapsedRef = useRef(collapsed);
  const collapsedSnapshot = useRef<boolean | null>(null);

  const target = stack.index >= 0 ? (stack.entries[stack.index] ?? null) : null;
  const open = (Boolean(target) || blankSplit) && desktop;

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (target) lastTargetRef.current = target;
  }, [target]);

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type !== 'reload') return;
    const fromUrl = parsePeekTarget(
      new URLSearchParams(window.location.search).get('peek') ?? undefined,
    );
    if (fromUrl) {
      writePeekCookie(fromUrl);
      return;
    }
    writePeekCookie(null);
  }, []);

  useEffect(() => {
    const onNavClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = e.target;
      if (!(el instanceof Element)) return;

      if (openRef.current) {
        const subnavA = el.closest('#nd-subnav a');
        if (subnavA instanceof HTMLAnchorElement) {
          if (subnavA.hasAttribute('download') || subnavA.target === '_blank') return;
          const href = subnavA.getAttribute('href') || subnavA.href;
          if (href && !isPureHashHref(href) && classifyLink(href, window.location.href) !== 'external') {
            e.preventDefault();
            e.stopPropagation();
            openFullPageRef.current(href);
            return;
          }
        }
      }

      if (openRef.current && !pinnedRef.current) {
        const a = el.closest('#nd-sidebar a');
        if (a instanceof HTMLAnchorElement) {
          if (a.hasAttribute('download') || a.target === '_blank') return;
          const href = a.getAttribute('href') || a.href;
          if (href && classifyLink(href, window.location.href) === 'docs') {
            e.preventDefault();
            e.stopPropagation();
            openPeekRef.current(href, 'main');
            return;
          }
        }
      }

      if (openRef.current) return;
      if (!el.closest('#nd-sidebar a, #nd-subnav a')) return;
      writePeekCookie(null);
    };
    document.addEventListener('click', onNavClick, true);
    return () => document.removeEventListener('click', onNavClick, true);
  }, []);

  useEffect(() => {
    const prev = pathnameRef.current;
    if (prev === pathname) return;
    pathnameRef.current = pathname;
    if (openRef.current) return;
    writePeekCookie(null);
    setBlankSplit(false);
    setPinned(false);
    setStack({ entries: [], index: -1 });
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const el = document.getElementById('nd-page');
      if (el) el.scrollTop = leftScrollRef.current;
    });
  }, [open, target?.path]);

  useEffect(() => {
    if (!setCollapsed) return;
    if (open) {
      if (collapsedSnapshot.current === null) collapsedSnapshot.current = collapsedRef.current;
      setCollapsed(true);
      return;
    }
    if (collapsedSnapshot.current !== null) {
      setCollapsed(collapsedSnapshot.current);
      collapsedSnapshot.current = null;
    }
  }, [open, setCollapsed]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  const rememberLeftScroll = () => {
    const el = document.getElementById('nd-page');
    if (el) leftScrollRef.current = el.scrollTop;
  };

  const resetPeekRatio = useCallback(() => {
    setPeekRatio(DEFAULT_PEEK_RATIO);
    const layout = document.getElementById('nd-notebook-layout');
    if (!layout) return;
    layout.style.setProperty('--fd-peek-left-fr', `${DEFAULT_PEEK_RATIO}fr`);
    layout.style.setProperty('--fd-peek-right-fr', `${1 - DEFAULT_PEEK_RATIO}fr`);
  }, []);

  const applyTarget = useCallback(
    (next: DocPeekTarget | null, nextStack: StackState) => {
      rememberLeftScroll();
      setBlankSplit(false);
      setStack(nextStack);
      writePeekCookie(next);
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  const openPeek = useCallback(
    (href: string, from: DocPeekSurface = 'main') => {
      const pageUrl = window.location.href;
      if (isSameDocsPage(href, pageUrl, pathname) && from === 'main') {
        const parsed = docsPathAndHashFromHref(href, pageUrl);
        if (parsed?.hash) {
          const id = decodeURIComponent(parsed.hash.slice(1));
          const page = document.getElementById('nd-page') ?? document;
          const heading = findAnchorInRoot(id, page);
          if (heading) {
            smoothScrollToElement(heading, {
              container: getAnchorScrollRoot(heading),
              block: 'start',
            });
          }
        }
        return;
      }

      const parsed = docsPathAndHashFromHref(href, pageUrl);
      if (!parsed) {
        router.push(href);
        return;
      }

      let nextStack: StackState;
      if (from === 'peek' && stack.index >= 0) {
        const entries = [...stack.entries.slice(0, stack.index + 1), parsed];
        nextStack = { entries, index: entries.length - 1 };
      } else {
        nextStack = { entries: [parsed], index: 0 };
      }
      if (!openRef.current) resetPeekRatio();
      applyTarget(parsed, nextStack);
    },
    [applyTarget, pathname, resetPeekRatio, router, stack],
  );
  openPeekRef.current = openPeek;

  const togglePeekPin = useCallback(() => {
    setPinned((prev) => !prev);
  }, []);

  const hydrate = useCallback((next: DocPeekTarget) => {
    lastTargetRef.current = next;
    setBlankSplit(false);
    setStack(stackFromTarget(next));
    writePeekCookie(next);
  }, []);

  const openSplitView = useCallback(() => {
    if (target || blankSplit) return;
    resetPeekRatio();
    const last = lastTargetRef.current;
    if (last) {
      applyTarget(last, stackFromTarget(last));
      return;
    }
    setBlankSplit(true);
  }, [applyTarget, blankSplit, resetPeekRatio, target]);

  const closePeek = useCallback(() => {
    setPinned(false);
    setBlankSplit(false);
    applyTarget(null, { entries: [], index: -1 });
  }, [applyTarget]);

  const openFullPage = useCallback(
    (href?: string) => {
      const next =
        href?.trim() ||
        (target ? canonicalDocsHref(target.path, target.hash) : '');
      setPinned(false);
      setBlankSplit(false);
      setStack({ entries: [], index: -1 });
      writePeekCookie(null);
      if (!next) {
        startTransition(() => {
          router.refresh();
        });
        return;
      }
      try {
        const url = new URL(next, window.location.href);
        if (stripTrailingSlash(url.pathname) === stripTrailingSlash(pathname)) {
          startTransition(() => {
            router.refresh();
          });
          return;
        }
      } catch {
        /* fall through to push */
      }
      router.push(next);
    },
    [pathname, router, target],
  );
  openFullPageRef.current = openFullPage;

  const refreshPeek = useCallback(() => {
    rememberLeftScroll();
    writePeekCookie(target);
    startTransition(() => {
      router.refresh();
    });
  }, [router, target]);

  const peekBack = useCallback(() => {
    if (stack.index <= 0) return;
    const index = stack.index - 1;
    applyTarget(stack.entries[index] ?? null, { entries: stack.entries, index });
  }, [applyTarget, stack]);

  const peekForward = useCallback(() => {
    if (stack.index < 0 || stack.index >= stack.entries.length - 1) return;
    const index = stack.index + 1;
    applyTarget(stack.entries[index] ?? null, { entries: stack.entries, index });
  }, [applyTarget, stack]);

  const value = useMemo<DocPeekContextValue>(
    () => ({
      open,
      desktop,
      target,
      blankSplit,
      peekRatio,
      setPeekRatio,
      splitDragging,
      setSplitDragging,
      canPeekBack: stack.index > 0,
      canPeekForward: stack.index >= 0 && stack.index < stack.entries.length - 1,
      pinned,
      togglePeekPin,
      openPeek,
      hydrate,
      openSplitView,
      closePeek,
      openFullPage,
      refreshPeek,
      peekBack,
      peekForward,
      pending,
    }),
    [
      blankSplit,
      closePeek,
      desktop,
      open,
      openFullPage,
      openPeek,
      hydrate,
      openSplitView,
      peekBack,
      peekForward,
      peekRatio,
      pending,
      pinned,
      refreshPeek,
      splitDragging,
      togglePeekPin,
      target,
      stack.index,
      stack.entries.length,
    ],
  );

  return <DocPeekContext.Provider value={value}>{children}</DocPeekContext.Provider>;
}
