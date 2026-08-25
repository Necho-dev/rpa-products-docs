'use client';

import { forwardRef, useCallback, useRef, useState, type MouseEvent } from 'react';
import FumadocsLink, { type LinkProps } from 'fumadocs-core/link';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { LinkActionDialog } from '@/components/docs/link-action-dialog';
import { DocsLinkHoverCard } from '@/components/docs/docs-link-hover-card';
import { useDocPeek, useDocPeekSurface } from '@/components/docs/doc-peek-context';
import { AISearchContext } from '@/components/ai/ai-search-context';
import { shouldPeekDocsLink } from '@/lib/docs/doc-peek';
import { classifyLink, docsPathAndHashFromHref } from '@/lib/docs/link-kind';
import {
  findAnchorInRoot,
  getAnchorQueryRoot,
  getAnchorScrollRoot,
  hashIdFromHref,
  smoothScrollToElement,
} from '@/lib/docs/smooth-scroll-to-anchor';
import { cn } from '@/lib/core/cn';

function isModifiedClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** 站内文档跳转；module-grid 传 onlyWhenSplit：单栏走左栏，双栏未锁定则覆盖右栏 */
export function useOpenDocsHref(options?: { onlyWhenSplit?: boolean }) {
  const peek = useDocPeek();
  const surface = useDocPeekSurface();
  const router = useRouter();
  const ai = use(AISearchContext);
  const onlyWhenSplit = Boolean(options?.onlyWhenSplit);

  return useCallback(
    (targetHref: string, e: MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || isModifiedClick(e)) return;
      const kind = classifyLink(targetHref, window.location.href);
      if (kind !== 'docs' || !peek) return;
      e.preventDefault();
      e.stopPropagation();
      if (
        !shouldPeekDocsLink({
          splitOpen: peek.open,
          surface,
          onlyWhenSplit,
          pinned: peek.pinned,
        })
      ) {
        router.push(targetHref);
        return;
      }
      ai?.setOpen(false);
      peek.openPeek(targetHref, surface);
    },
    [ai, onlyWhenSplit, peek, router, surface],
  );
}

export const DocsLink = forwardRef<HTMLAnchorElement, LinkProps>(function DocsLink(
  { href = '#', onClick, className, ...props },
  ref,
) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const peek = useDocPeek();
  const surface = useDocPeekSurface();
  const router = useRouter();
  const ai = use(AISearchContext);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setHoverPath(null), 160);
  }, [cancelHide]);

  const openDocs = useCallback(
    (targetHref: string) => {
      ai?.setOpen(false);
      peek?.openPeek(targetHref, surface);
    },
    [ai, peek, surface],
  );

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || isModifiedClick(e)) return;

    const kind = classifyLink(href, window.location.href);
    if (kind === 'hash') {
      const id = hashIdFromHref(href, window.location.href);
      if (!id) return;
      const scrollRoot = getAnchorScrollRoot(e.currentTarget);
      const heading = findAnchorInRoot(id, getAnchorQueryRoot(scrollRoot));
      if (!heading) return;
      e.preventDefault();
      const hash = `#${id}`;
      const next = `${window.location.pathname}${window.location.search}${hash}`;
      if (window.location.hash !== hash) history.pushState(null, '', next);
      smoothScrollToElement(heading, { container: scrollRoot, block: 'start' });
      return;
    }

    if (kind === 'external') {
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen(true);
      return;
    }

    if (!peek) return;

    if (kind === 'same-origin-other') {
      e.preventDefault();
      router.push(href);
      return;
    }

    if (kind === 'docs') {
      e.preventDefault();
      e.stopPropagation();
      if (
        !shouldPeekDocsLink({
          splitOpen: peek.open,
          surface,
          pinned: peek.pinned,
        })
      ) {
        router.push(href);
        return;
      }
      openDocs(href);
    }
  };

  return (
    <>
      <span
        ref={anchorRef}
        className="relative inline"
        onMouseEnter={() => {
          if (!peek?.desktop) return;
          const kind = classifyLink(href, window.location.href);
          if (kind !== 'docs') return;
          const parsed = docsPathAndHashFromHref(href, window.location.href);
          if (!parsed) return;
          cancelHide();
          setHoverPath(parsed.path);
        }}
        onMouseLeave={scheduleHide}
      >
        <FumadocsLink ref={ref} href={href} onClick={handleClick} className={cn(className)} {...props} />
      </span>
      {hoverPath ? (
        <DocsLinkHoverCard
          path={hoverPath}
          anchorRef={anchorRef}
          onBrowse={() => {
            if (
              peek &&
              !shouldPeekDocsLink({
                splitOpen: peek.open,
                surface,
                pinned: peek.pinned,
              })
            ) {
              router.push(href);
              return;
            }
            openDocs(href);
          }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      ) : null}
      <LinkActionDialog open={menuOpen} href={href} onClose={() => setMenuOpen(false)} />
    </>
  );
});

DocsLink.displayName = 'DocsLink';
