'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  GripVerticalIcon,
  PinIcon,
  SquareArrowOutUpRightIcon,
  XIcon,
} from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/lib/core/cn';
import { canonicalDocsHref } from '@/lib/docs/doc-peek';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { DocPeekSurfaceProvider, useDocPeek } from '@/components/docs/doc-peek-context';
import { PeekArticleDialog } from '@/components/docs/peek-article-dialog';
import { PeekFloatingAnchors } from '@/components/docs/floating-anchors';
import { PeekArticleSkeleton, PeekLoadingHint } from '@/components/docs/peek-loading';

function PeekIconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-full min-w-0 flex-1 items-center justify-center rounded-md',
        'text-fd-foreground/80 transition-colors',
        'hover:bg-fd-muted hover:text-fd-foreground',
        'disabled:pointer-events-none disabled:text-fd-muted-foreground/35',
        pressed && 'bg-fd-muted text-fd-primary hover:text-fd-primary',
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

const PEEK_RATIO_MIN = 0.28;
const PEEK_RATIO_MAX = 0.72;

function clampPeekRatio(value: number) {
  return Math.min(PEEK_RATIO_MAX, Math.max(PEEK_RATIO_MIN, value));
}

function writePeekRatioVars(layout: HTMLElement, ratio: number) {
  const next = clampPeekRatio(ratio);
  layout.style.setProperty('--fd-peek-left-fr', `${next}fr`);
  layout.style.setProperty('--fd-peek-right-fr', `${1 - next}fr`);
  return next;
}

function peekRatioFromClientX(layout: HTMLElement, clientX: number) {
  const rect = layout.getBoundingClientRect();
  const cs = getComputedStyle(layout);
  const sidebar = Number.parseFloat(cs.getPropertyValue('--fd-sidebar-col') || '0');
  const inset = Number.parseFloat(cs.getPropertyValue('--fd-docs-inline-start') || '0');
  const usable = rect.width - inset - sidebar;
  if (usable <= 0) return null;
  return clampPeekRatio((clientX - rect.left - inset - sidebar) / usable);
}

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
  const dragRatio = useRef(0.5);
  const [copied, onCopy] = useCopyButton(() => {
    const target = peek?.target;
    if (!target) return;
    const href =
      typeof window === 'undefined'
        ? canonicalDocsHref(target.path, target.hash)
        : `${window.location.origin}${canonicalDocsHref(target.path, target.hash)}`;
    void safeWriteClipboard(href);
  });

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const layout = document.getElementById('nd-notebook-layout');
      if (!layout || !peek) return;
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      dragRatio.current = peek.peekRatio;
      peek.setSplitDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [peek],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !peek) return;
      const layout = document.getElementById('nd-notebook-layout');
      if (!layout) return;
      const next = peekRatioFromClientX(layout, e.clientX);
      if (next == null) return;
      dragRatio.current = writePeekRatioVars(layout, next);
    },
    [peek],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !peek) return;
      dragging.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      peek.setPeekRatio(dragRatio.current);
      peek.setSplitDragging(false);
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
        aria-valuemin={Math.round(PEEK_RATIO_MIN * 100)}
        aria-valuemax={Math.round(PEEK_RATIO_MAX * 100)}
        aria-valuenow={Math.round((peek.peekRatio) * 100)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'group/split absolute inset-s-0 top-0 z-20 flex h-full w-4 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center',
          'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-fd-border/80',
          'hover:before:bg-fd-primary/70',
          peek.splitDragging && 'before:bg-fd-primary',
        )}
      >
        <div
          className={cn(
            'relative z-10 flex h-11 w-4 items-center justify-center rounded-full',
            'border border-fd-border/80 bg-fd-background text-fd-muted-foreground shadow-sm',
            'transition-colors duration-150',
            'group-hover/split:border-fd-primary/40 group-hover/split:text-fd-foreground group-hover/split:shadow-md',
            peek.splitDragging && 'border-fd-primary/60 text-fd-primary shadow-md',
          )}
        >
          <GripVerticalIcon className="size-3.5" strokeWidth={2.25} />
        </div>
      </div>
      <div
        className={cn(
          'pointer-events-auto absolute top-3 inset-e-3 z-30',
          'flex h-9 w-60 items-center rounded-lg border border-fd-border/70 bg-fd-background p-0.5 shadow-md',
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
            label={copied ? '已复制' : '复制链接'}
            onClick={onCopy}
          >
            {copied ? (
              <CheckIcon {...peekToolbarIcon} />
            ) : (
              <CopyIcon {...peekToolbarIcon} />
            )}
          </PeekIconButton>
          <PeekIconButton
            label={peek.pinned ? '取消固定' : '固定右栏'}
            pressed={peek.pinned}
            onClick={() => peek.togglePeekPin()}
          >
            <PinIcon
              {...peekToolbarIcon}
              fill={peek.pinned ? 'currentColor' : 'none'}
            />
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
