'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
import { canonicalDocsHref, PEEK_RATIO_PRESETS } from '@/lib/docs/doc-peek';
import {
  findAnchorInRoot,
  getStickyOverlapOffset,
} from '@/lib/docs/smooth-scroll-to-anchor';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { DocPeekSurfaceProvider, useDocPeek } from '@/components/docs/doc-peek-context';
import { PeekArticleDialog } from '@/components/docs/peek-article-dialog';
import { PeekFloatingAnchors } from '@/components/docs/floating-anchors';
import { PeekArticleSkeleton, PeekLoadingHint } from '@/components/docs/peek-loading';

const emptySubscribe = () => () => {};

/** SSR 与 hydration 首帧返回 false，客户端返回 true，避免 effect 内 setState。 */
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function PeekRatioLegend({ leftFr, active }: { leftFr: number; active: boolean }) {
  const rightFr = Math.max(0.01, 1 - leftFr);
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-3.5 w-6 shrink-0 items-stretch gap-px rounded-sm p-px',
        active ? 'bg-fd-primary/15' : 'bg-fd-muted',
      )}
    >
      <span
        className={cn('rounded-[1px]', active ? 'bg-fd-primary/80' : 'bg-fd-foreground/45')}
        style={{ flex: leftFr }}
      />
      <span
        className={cn('rounded-[1px]', active ? 'bg-fd-primary/30' : 'bg-fd-foreground/18')}
        style={{ flex: rightFr }}
      />
    </span>
  );
}

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
        'flex size-8 shrink-0 items-center justify-center rounded-md',
        'text-fd-foreground transition-colors',
        'hover:bg-fd-muted hover:text-fd-foreground',
        'disabled:pointer-events-none disabled:opacity-35',
        pressed && 'bg-fd-muted text-fd-primary hover:text-fd-primary',
      )}
    >
      {children}
    </button>
  );
}

const peekToolbarIcon = {
  className: 'size-4.5',
  strokeWidth: 2.25,
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

/** 用左右栏真实盒模型算比例，避免把 rem CSS 变量 parseFloat 成错误像素。 */
function peekSplitBounds() {
  const page = document.getElementById('nd-page');
  const pane = document.querySelector('[data-doc-peek-panel]');
  if (!page || !(pane instanceof HTMLElement)) return null;
  const start = page.getBoundingClientRect().left;
  const end = pane.getBoundingClientRect().right;
  const usable = end - start;
  if (usable <= 0) return null;
  return { start, usable, splitX: pane.getBoundingClientRect().left };
}

function peekRatioFromClientX(clientX: number) {
  const bounds = peekSplitBounds();
  if (!bounds) return null;
  return clampPeekRatio((clientX - bounds.start) / bounds.usable);
}

export function DocSplitShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const peek = useDocPeek();
  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const dragging = useRef(false);
  const dragRatio = useRef(0.5);
  const grabOffset = useRef(0);
  const [copied, onCopy] = useCopyButton(() => {
    const target = peek?.target;
    if (!target) return;
    const href =
      typeof window === 'undefined'
        ? canonicalDocsHref(target.path, target.hash)
        : `${window.location.origin}${canonicalDocsHref(target.path, target.hash)}`;
    void safeWriteClipboard(href);
  });
  const [ratioMenu, setRatioMenu] = useState(false);
  const ratioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const client = useIsClient();

  const showRatioMenu = () => {
    if (peek?.splitDragging) return;
    if (ratioTimer.current) clearTimeout(ratioTimer.current);
    ratioTimer.current = setTimeout(() => setRatioMenu(true), 160);
  };

  const hideRatioMenu = () => {
    if (ratioTimer.current) clearTimeout(ratioTimer.current);
    ratioTimer.current = setTimeout(() => setRatioMenu(false), 120);
  };

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const layout = document.getElementById('nd-notebook-layout');
      if (!layout || !peek) return;
      e.preventDefault();
      e.stopPropagation();
      const bounds = peekSplitBounds();
      grabOffset.current = bounds ? e.clientX - bounds.splitX : 0;
      dragging.current = true;
      dragRatio.current = peek.peekRatio;
      layout.setAttribute('data-peek-dragging', 'true');
      peek.setSplitDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      setRatioMenu(false);
      if (ratioTimer.current) clearTimeout(ratioTimer.current);
    },
    [peek],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !peek) return;
      const layout = document.getElementById('nd-notebook-layout');
      if (!layout) return;
      const next = peekRatioFromClientX(e.clientX - grabOffset.current);
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
    const panel = panelRef.current;
    const scroller =
      panel?.querySelector<HTMLDivElement>('[data-doc-peek-scroll]') ?? null;
    scrollRef.current = scroller;
    setScrollEl(scroller);
    const path =
      panel?.querySelector('[data-doc-path]')?.getAttribute('data-doc-path') ??
      scroller?.getAttribute('data-doc-path') ??
      null;
    setLoadedPath(path);
  }, [children, peek?.pending, peek?.target?.path]);

  useEffect(() => {
    const hash = peek?.target?.hash;
    if (!hash) return;
    const root = scrollRef.current;
    if (!root) return;
    let id = hash.replace(/^#/, '');
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep raw */
    }
    const el = findAnchorInRoot(id, root);
    if (!el) return;
    const offset = getStickyOverlapOffset(root);
    const top =
      el.getBoundingClientRect().top -
      root.getBoundingClientRect().top +
      root.scrollTop -
      offset;
    root.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }, [peek?.target?.path, peek?.target?.hash, children, loadedPath]);

  if (!peek) return null;
  const hasArticle = children != null;
  const sheet = client && peek.desktop === false && Boolean(peek.target);
  if (client && !peek.open && !sheet) return null;
  if (!peek.target && !peek.blankSplit && !hasArticle) return null;
  const loading = Boolean(peek.target && loadedPath !== peek.target.path);
  const copyHref = peek.target
    ? typeof window === 'undefined'
      ? canonicalDocsHref(peek.target.path, peek.target.hash)
      : `${window.location.origin}${canonicalDocsHref(peek.target.path, peek.target.hash)}`
    : '';

  return (
    <>
      {sheet ? <PeekArticleDialog title={title}>{children}</PeekArticleDialog> : null}
      <aside
      ref={panelRef}
      data-doc-peek-panel=""
      aria-label={title}
      className={cn(
        'relative z-20 hidden min-h-0 min-w-0 overflow-visible border-s border-fd-border/40 bg-fd-background xl:flex xl:flex-col',
        'isolate',
        '[grid-area:peek] [--fd-toc-width:12.5rem]',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-1 before:h-2 before:bg-linear-to-b before:from-[rgba(15,23,42,0.035)] before:to-transparent',
        'dark:before:from-black/22',
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
          'group/split absolute inset-s-0 top-0 z-30 flex h-full w-4 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center',
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
          onMouseEnter={showRatioMenu}
          onMouseLeave={hideRatioMenu}
        >
          <GripVerticalIcon className="size-3.5" strokeWidth={2.25} />
          {ratioMenu && !peek.splitDragging ? (
            <div
              className="absolute inset-s-full top-1/2 z-30 ms-2 flex min-w-22 -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-fd-border/60 bg-fd-background/90 p-1.5 shadow-lg backdrop-blur-md"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={showRatioMenu}
              onMouseLeave={hideRatioMenu}
            >
              {PEEK_RATIO_PRESETS.map((preset) => {
                const active = Math.abs(peek.peekRatio - preset.ratio) < 0.02;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    title={`左:右 ${preset.label}`}
                    onClick={() => {
                      const layout = document.getElementById('nd-notebook-layout');
                      if (layout) writePeekRatioVars(layout, preset.ratio);
                      peek.setPeekRatio(preset.ratio);
                      setRatioMenu(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium tabular-nums',
                      active
                        ? 'bg-fd-primary/10 text-fd-primary'
                        : 'text-fd-muted-foreground hover:bg-fd-muted/80 hover:text-fd-foreground',
                    )}
                  >
                    <PeekRatioLegend leftFr={preset.ratio} active={active} />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div
        data-doc-peek-toolbar=""
        className="pointer-events-none absolute inset-e-1.5 top-2 z-40 flex justify-end transition-opacity duration-150"
      >
        <div
          className={cn(
            'pointer-events-auto flex h-9 items-center gap-0.5 rounded-lg p-0.5',
            'border border-fd-border/80 bg-fd-background/95 shadow-sm backdrop-blur-md',
            'transition-opacity duration-150',
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
            disabled={!peek.target}
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
            disabled={!peek.target}
            onClick={() => {
              if (!copyHref) return;
              window.open(copyHref, '_blank', 'noopener,noreferrer');
            }}
          >
            <SquareArrowOutUpRightIcon {...peekToolbarIcon} />
          </PeekIconButton>
          <PeekIconButton label="关闭" onClick={() => peek.closePeek()}>
            <XIcon {...peekToolbarIcon} />
          </PeekIconButton>
        </div>
      </div>
        <div
          aria-busy={loading || undefined}
          data-doc-peek-scroll=""
          className="relative z-0 min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          <DocPeekSurfaceProvider surface="peek">
            {peek.target
              ? (children ?? (loading ? <PeekArticleSkeleton /> : null))
              : (
                <div className="flex min-h-full flex-col items-center justify-center gap-2 px-8 py-16 text-center">
                  <p className="text-sm font-medium">对照阅读</p>
                  <p className="max-w-xs text-xs leading-relaxed text-fd-muted-foreground">
                    点击左栏正文里的站内链接，文档会在这一侧打开。
                  </p>
                </div>
              )}
          </DocPeekSurfaceProvider>
        </div>
        {loading && children ? (
          <div className="pointer-events-auto absolute inset-0 z-20">
            <PeekLoadingHint overlay />
          </div>
        ) : null}
        {peek.target ? (
          <PeekFloatingAnchors scrollRoot={scrollEl} pageUrl={copyHref} />
        ) : null}
      </aside>
    </>
  );
}
