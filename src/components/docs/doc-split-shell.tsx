'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SquareArrowOutUpRightIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { canonicalDocsHref } from '@/lib/docs/doc-peek';
import { DocPeekSurfaceProvider, useDocPeek } from '@/components/docs/doc-peek-context';
import { PeekArticleDialog } from '@/components/docs/peek-article-dialog';
import { PeekFloatingAnchors } from '@/components/docs/floating-anchors';
import { PeekArticleSkeleton, PeekLoadingHint } from '@/components/docs/peek-loading';

function PeekIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-full min-w-0 flex-1 items-center justify-center rounded-md',
        'text-fd-foreground/80 transition-colors',
        'hover:bg-fd-muted hover:text-fd-foreground',
        'disabled:pointer-events-none disabled:text-fd-muted-foreground/35',
      )}
    >
      {children}
    </button>
  );
}

const peekToolbarIcon = {
  className: 'size-[18px]',
  strokeWidth: 2.5,
} as const;

export function DocSplitShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const peek = useDocPeek();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      const layout = document.getElementById('nd-notebook-layout');
      if (!layout) return;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const rect = layout.getBoundingClientRect();
        const cs = getComputedStyle(layout);
        const sidebar = Number.parseFloat(cs.getPropertyValue('--fd-sidebar-col') || '0');
        const inset = Number.parseFloat(cs.getPropertyValue('--fd-docs-inline-start') || '0');
        const split = 0;
        const usable = rect.width - inset - sidebar - split;
        if (usable <= 0) return;
        const x = ev.clientX - rect.left - inset - sidebar;
        const ratio = Math.min(0.72, Math.max(0.28, x / usable));
        peek?.setPeekRatio(ratio);
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [peek],
  );

  useLayoutEffect(() => {
    const root = scrollRef.current;
    const path = root?.querySelector('[data-doc-path]')?.getAttribute('data-doc-path') ?? null;
    setLoadedPath(path);
  }, [children, peek?.pending, peek?.target?.path]);

  useEffect(() => {
    const hash = peek?.target?.hash;
    if (!hash) return;
    const root = scrollRef.current;
    if (!root) return;
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const el = root.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top, behavior: 'instant' });
  }, [peek?.target?.path, peek?.target?.hash, children, loadedPath]);

  if (!peek?.target) return null;
  if (!peek.desktop) {
    return <PeekArticleDialog title={title}>{children}</PeekArticleDialog>;
  }

  const loading = Boolean(peek.pending || loadedPath !== peek.target.path);
  const copyHref =
    typeof window === 'undefined'
      ? canonicalDocsHref(peek.target.path, peek.target.hash)
      : `${window.location.origin}${canonicalDocsHref(peek.target.path, peek.target.hash)}`;

  return (
    <aside
      data-doc-peek-panel=""
      aria-label={title}
      className={cn(
        'relative z-10 hidden min-h-0 min-w-0 overflow-hidden border-s border-fd-border/40 bg-fd-background xl:flex xl:flex-col',
        '[grid-area:peek] [--fd-toc-width:12.5rem]',
        'animate-in fade-in slide-in-from-right-8 duration-400 fill-mode-both',
      )}
    >
      <div
        data-doc-peek-split=""
        role="separator"
        aria-orientation="vertical"
        aria-label="调整分栏宽度"
        onPointerDown={onPointerDown}
        className="absolute inset-s-0 top-0 z-20 h-full w-2 -translate-x-1/2 cursor-col-resize"
      />
      <div
        className={cn(
          'pointer-events-auto absolute top-3 inset-e-3 z-30',
          'flex h-9 w-40 items-center rounded-lg border border-fd-border/70 bg-fd-background p-0.5 shadow-md',
        )}
      >
          <PeekIconButton
            label="后退"
            disabled={!peek.canPeekBack}
            onClick={() => peek.peekBack()}
          >
            <ArrowLeftIcon {...peekToolbarIcon} />
          </PeekIconButton>
          <PeekIconButton
            label="前进"
            disabled={!peek.canPeekForward}
            onClick={() => peek.peekForward()}
          >
            <ArrowRightIcon {...peekToolbarIcon} />
          </PeekIconButton>
          <PeekIconButton
            label="新标签打开"
            onClick={() => {
              window.open(copyHref, '_blank', 'noopener,noreferrer');
            }}
          >
            <SquareArrowOutUpRightIcon {...peekToolbarIcon} />
          </PeekIconButton>
          <PeekIconButton label="关闭" onClick={() => peek.closePeek()}>
            <XIcon {...peekToolbarIcon} />
          </PeekIconButton>
        </div>
        <div
          ref={(node) => {
            scrollRef.current = node;
            setScrollEl(node);
          }}
          data-doc-peek-scroll=""
          aria-busy={loading || undefined}
          className="relative min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          <DocPeekSurfaceProvider surface="peek">
            {children ?? (loading ? <PeekArticleSkeleton /> : null)}
          </DocPeekSurfaceProvider>
          {loading && children ? <PeekLoadingHint overlay /> : null}
        </div>
        <PeekFloatingAnchors scrollRoot={scrollEl} pageUrl={copyHref} />
      </aside>
  );
}
