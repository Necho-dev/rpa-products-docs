'use client';

import { useEffect, useState, useSyncExternalStore, type AnimationEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { ExcerptCollectionIcon } from '@/components/docs/excerpt-collection-icon';
import { ExcerptCollectionItem } from '@/components/docs/selection/excerpt-collection-item';
import { useExcerptCollection } from '@/components/docs/selection/excerpt-collection-context';
import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';

const emptySubscribe = () => () => {};

const PANEL_OUT_MS = 320;

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

type ExcerptListSectionProps = {
  title: string;
  items: DocHighlight[];
  onNavigate: (highlight: DocHighlight) => void;
  onDelete: (highlight: DocHighlight) => void;
};

function ExcerptListSection({
  title,
  items,
  onNavigate,
  onDelete,
}: ExcerptListSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-0.5 text-[11px] font-medium tracking-wide text-fd-muted-foreground">
        {title}
        <span className="ms-1.5 font-normal opacity-70">({items.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((h) => (
          <ExcerptCollectionItem
            key={h.id}
            highlight={h}
            onNavigate={onNavigate}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  );
}

export function ExcerptCollectionDrawer() {
  const isClient = useIsClient();
  const {
    open,
    setOpen,
    highlights,
    currentPageHighlights,
    otherHighlights,
    navigateToHighlight,
    deleteHighlight,
    locateError,
    clearLocateError,
    closeDeleteConfirm,
  } = useExcerptCollection();

  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  const showCurrentSection = currentPageHighlights.length > 0;
  const showOtherSection = otherHighlights.length > 0;
  const splitView = showCurrentSection && showOtherSection;

  useEffect(() => {
    if (!open) return;

    const id = requestAnimationFrame(() => {
      setExiting(false);
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;

    const id = requestAnimationFrame(() => setExiting(true));
    const fallback = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, PANEL_OUT_MS + 80);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(fallback);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, setOpen]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const handlePanelAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !exiting) return;
    setMounted(false);
    setExiting(false);
  };

  if (!isClient || !mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden={exiting}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]',
          exiting ? 'excerpt-drawer-backdrop-out' : 'excerpt-drawer-backdrop-in',
          'motion-reduce:animate-none',
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="摘录集"
        className={cn(
          'excerpt-drawer-panel fixed inset-y-0 inset-e-0 z-45 flex flex-col',
          'w-[min(calc(100vw-1rem),400px)] max-sm:w-full',
          'border-s border-fd-border/60 bg-fd-card text-fd-card-foreground shadow-2xl',
          exiting ? 'excerpt-drawer-panel-out' : 'excerpt-drawer-panel-in',
          'motion-reduce:animate-none',
        )}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-fd-border/50 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
              <ExcerptCollectionIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-medium leading-tight text-fd-foreground">摘录集</h2>
              <p className="mt-[2.5px] text-[11px] leading-tight text-fd-muted-foreground">
                {highlights.length > 0 ? `累计 ${highlights.length} 条划线` : '你的阅读摘录'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭摘录集"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              'text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground',
            )}
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        </header>

        {locateError ? (
          <div className="mx-4 mt-3 flex items-start justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100">
            <span className="leading-relaxed">{locateError}</span>
            <button
              type="button"
              className="shrink-0 rounded-md px-1.5 py-0.5 text-amber-800/80 hover:bg-amber-500/15 dark:text-amber-100/80"
              onClick={clearLocateError}
            >
              知道了
            </button>
          </div>
        ) : null}

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain fd-scroll-container px-4 py-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDeleteConfirm();
          }}
        >
          {highlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-fd-muted/60 text-fd-muted-foreground">
                <ExcerptCollectionIcon className="size-6 opacity-60" />
              </span>
              <p className="text-sm font-medium text-fd-foreground">暂无摘录</p>
              <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-fd-muted-foreground">
                选中文本后点击「划线」，即可在这里统一查看
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {showCurrentSection ? (
                <ExcerptListSection
                  title="当前文档"
                  items={currentPageHighlights}
                  onNavigate={(item) => void navigateToHighlight(item)}
                  onDelete={(item) => void deleteHighlight(item)}
                />
              ) : null}
              {splitView ? <div className="border-t border-fd-border/40" aria-hidden /> : null}
              {showOtherSection ? (
                <ExcerptListSection
                  title={showCurrentSection ? '其他文档' : '全部摘录'}
                  items={otherHighlights}
                  onNavigate={(item) => void navigateToHighlight(item)}
                  onDelete={(item) => void deleteHighlight(item)}
                />
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
