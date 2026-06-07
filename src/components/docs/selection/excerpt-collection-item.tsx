'use client';

import { CircleAlert, Trash2 } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { useExcerptCollection } from '@/components/docs/selection/excerpt-collection-context';
import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';
import {
  formatHighlightCreatedAt,
  resolveHighlightPageTitle,
} from '@/lib/docs/selection/resolve-highlight-page-title';
import { formatExcerptQuoteForDisplay } from '@/lib/docs/selection/format-excerpt-quote-display';

type ExcerptCollectionItemProps = {
  highlight: DocHighlight;
  onNavigate: (highlight: DocHighlight) => void;
  onDelete: (highlight: DocHighlight) => void;
};

export function ExcerptCollectionItem({
  highlight,
  onNavigate,
  onDelete,
}: ExcerptCollectionItemProps) {
  const { deleteConfirmId, openDeleteConfirm, closeDeleteConfirm } = useExcerptCollection();
  const isConfirming = deleteConfirmId === highlight.id;
  const pageTitle = resolveHighlightPageTitle(highlight);
  const createdLabel = formatHighlightCreatedAt(highlight.createdAt);
  const quoteText = formatExcerptQuoteForDisplay(highlight.exact);

  const handleConfirmDelete = () => {
    closeDeleteConfirm();
    void onDelete(highlight);
  };

  return (
    <li className="min-w-0">
      <div
        className={cn(
          'excerpt-collection-card group relative min-w-0 rounded-lg',
          'border border-fd-border/40 bg-fd-muted/25 dark:bg-fd-muted/15',
          'transition-[border-color,background-color] duration-200',
          'hover:border-fd-primary/15 hover:bg-fd-muted/40 dark:hover:bg-fd-muted/25',
          isConfirming && 'border-destructive/30 bg-destructive/[0.03]',
        )}
      >
        <div
          role="button"
          tabIndex={0}
          className="block w-full min-w-0 cursor-pointer px-3 pb-2.5 pt-6 text-start outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-1 rounded-lg"
          onClick={() => {
            if (isConfirming) return;
            onNavigate(highlight);
          }}
          onKeyDown={(event) => {
            if (isConfirming) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onNavigate(highlight);
            }
          }}
        >
          <p className="excerpt-collection-quote text-xs leading-[1.55] text-fd-foreground/90">
            {quoteText}
          </p>
        </div>

        {isConfirming ? (
          <div
            className="excerpt-delete-confirm-inline mx-3 mb-2.5 border-t border-fd-border/25 pt-2"
            role="dialog"
            aria-label="确认删除摘录"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-start gap-1.5">
                <CircleAlert className="excerpt-delete-confirm-icon mt-0.5 shrink-0" aria-hidden />
                <span className="text-xs leading-snug text-fd-foreground">确定删除这条摘录？</span>
              </div>
              <div className="excerpt-delete-confirm-actions shrink-0">
                <button
                  type="button"
                  className="excerpt-delete-confirm-btn excerpt-delete-confirm-btn-default"
                  onClick={closeDeleteConfirm}
                >
                  我再想想
                </button>
                <button
                  type="button"
                  className="excerpt-delete-confirm-btn excerpt-delete-confirm-btn-danger"
                  onClick={handleConfirmDelete}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 mb-2.5 flex items-center justify-between gap-2 border-t border-fd-border/25 pt-2 text-[10px] text-fd-muted-foreground">
            <span className="min-w-0 truncate">{pageTitle}</span>
            <span className="shrink-0 tabular-nums">{createdLabel}</span>
          </div>
        )}

        <button
          type="button"
          title="删除此摘录"
          aria-label="删除此摘录"
          aria-expanded={isConfirming}
          className={cn(
            'absolute top-1.5 inset-e-1.5 z-10 flex size-7 items-center justify-center rounded-md',
            'text-fd-muted-foreground opacity-0 transition-opacity',
            'group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
            isConfirming && 'bg-destructive/10 text-destructive opacity-100',
          )}
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation();
            if (isConfirming) {
              closeDeleteConfirm();
              return;
            }
            openDeleteConfirm(highlight.id);
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
