'use client';

import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';
import { formatExcerptQuoteForDisplay } from '@/lib/docs/selection/format-excerpt-quote-display';
import {
  formatHighlightCreatedAt,
  resolveHighlightPageTitle,
} from '@/lib/docs/selection/resolve-highlight-page-title';

type ExcerptDeleteConfirmPanelProps = {
  highlight: DocHighlight | null;
  loading?: boolean;
  notFoundMessage?: string | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  /** 摘录不存在时仅提示，不展示确认按钮 */
  variant?: 'confirm' | 'not-found';
};

/** 摘录删除确认（含正文预览），与摘录集抽屉内联确认条样式一致。 */
export function ExcerptDeleteConfirmPanel({
  highlight,
  loading = false,
  notFoundMessage = null,
  busy = false,
  onConfirm,
  onCancel,
  className,
  variant = 'confirm',
}: ExcerptDeleteConfirmPanelProps) {
  const isNotFound = variant === 'not-found';

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-lg',
        isNotFound
          ? 'border border-amber-500/30 bg-amber-500/10'
          : 'border border-destructive/30 bg-destructive/[0.03]',
        className,
      )}
    >
      {loading ? (
        <div className="px-3 py-3 text-xs text-fd-muted-foreground">加载摘录内容…</div>
      ) : highlight ? (
        <div className="px-3 pt-3">
          <p className="excerpt-collection-quote text-xs leading-[1.55] text-fd-foreground/90">
            {formatExcerptQuoteForDisplay(highlight.exact)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-fd-muted-foreground">
            <span className="min-w-0 truncate">{resolveHighlightPageTitle(highlight)}</span>
            <span className="shrink-0 tabular-nums">{formatHighlightCreatedAt(highlight.createdAt)}</span>
          </div>
        </div>
      ) : notFoundMessage ? (
        <div className="flex items-start gap-1.5 px-3 py-3">
          <CircleAlert className="excerpt-delete-confirm-icon mt-0.5 shrink-0" aria-hidden />
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">{notFoundMessage}</p>
        </div>
      ) : null}

      {!isNotFound ? (
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
                disabled={busy}
                onClick={onCancel}
              >
                我再想想
              </button>
              <button
                type="button"
                className="excerpt-delete-confirm-btn excerpt-delete-confirm-btn-danger"
                disabled={busy || !highlight}
                onClick={onConfirm}
              >
                {busy ? '处理中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
