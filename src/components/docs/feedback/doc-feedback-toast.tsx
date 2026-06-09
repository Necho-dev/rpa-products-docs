'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2Icon } from 'lucide-react';
import { cn } from '@/lib/core/cn';

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function DocFeedbackToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const isClient = useIsClient();

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  if (!isClient) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] z-10000 flex justify-center px-4"
    >
      <div
        className={cn(
          'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-fd-border/80',
          'bg-fd-popover px-4 py-3 text-sm font-medium text-fd-popover-foreground shadow-lg',
          'animate-fd-fade-in',
        )}
      >
        <CheckCircle2Icon className="size-5 shrink-0 text-green-600 dark:text-green-400" />
        <span>{message}</span>
      </div>
    </div>,
    document.body,
  );
}
