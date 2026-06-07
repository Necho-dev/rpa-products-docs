'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkPlus, X } from 'lucide-react';
import { cn } from '@/lib/core/cn';

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

type SharedQuotePromptProps = {
  open: boolean;
  onAdd: () => void;
  onDismiss: () => void;
};

export function SharedQuotePrompt({ open, onAdd, onDismiss }: SharedQuotePromptProps) {
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onDismiss]);

  if (!isClient || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="分享摘录"
      className="shared-quote-prompt fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="shared-quote-prompt-panel pointer-events-auto w-full max-w-xl">
        <div className="flex items-center gap-3">
          <span className="shared-quote-prompt-icon flex size-8 shrink-0 items-center justify-center rounded-full">
            <BookmarkPlus className="size-4" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm leading-snug text-fd-foreground">
            朋友分享了一段摘录，是否添加到你的摘录集？
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="shared-quote-prompt-btn shared-quote-prompt-btn-default"
              onClick={onDismiss}
            >
              忽略
            </button>
            <button
              type="button"
              className="shared-quote-prompt-btn shared-quote-prompt-btn-primary"
              onClick={onAdd}
            >
              添加
            </button>
            <button
              type="button"
              aria-label="关闭"
              className={cn(
                'flex size-7 items-center justify-center rounded-md',
                'text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground',
              )}
              onClick={onDismiss}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
