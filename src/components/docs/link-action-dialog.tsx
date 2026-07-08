'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  ShieldCheckIcon,
  SquareArrowUpRightIcon,
  SquareMousePointerIcon,
  XIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/core/cn';
import { siteName } from '@/lib/core/shared';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function isExternalHref(href: string): boolean {
  return /^\w+:/.test(href) || href.startsWith('//');
}

function toAbsoluteUrl(href: string): string {
  if (typeof window === 'undefined') return href;
  try {
    return new URL(href, window.location.origin).href;
  } catch {
    return href;
  }
}

function isSameOriginLink(absoluteUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(absoluteUrl).origin === window.location.origin;
  } catch {
    return !isExternalHref(absoluteUrl);
  }
}

function getLinkHint(absoluteUrl: string): { kind: 'internal' | 'external'; text: string } {
  if (isSameOriginLink(absoluteUrl)) {
    return { kind: 'internal', text: '站内安全链接，请放心访问！' };
  }
  return { kind: 'external', text: `即将离开「${siteName}」，请注意甄别！` };
}

export type LinkActionDialogProps = {
  open: boolean;
  href: string;
  onClose: () => void;
};

export function LinkActionDialog({ open, href, onClose }: LinkActionDialogProps) {
  const isClient = useIsClient();
  const router = useRouter();
  const absoluteUrl = toAbsoluteUrl(href);
  const external = !isSameOriginLink(absoluteUrl);
  const hint = getLinkHint(absoluteUrl);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const openSameTab = useCallback(() => {
    onClose();
    if (external) {
      window.location.assign(absoluteUrl);
      return;
    }
    router.push(href);
  }, [absoluteUrl, external, href, onClose, router]);

  const openNewTab = useCallback(() => {
    onClose();
    window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
  }, [absoluteUrl, onClose]);

  const dialog =
    open && isClient ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="链接操作"
        className="fixed inset-0 z-9999 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-fd-border/60 bg-fd-card shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium">跳转提示</span>
            <button
              type="button"
              title="关闭"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="shrink-0 space-y-1.5 px-4 pb-3">
            <p
              className={cn(
                'flex items-start gap-1.5 text-sm leading-snug',
                hint.kind === 'external'
                  ? 'text-amber-900 dark:text-amber-100'
                  : 'text-emerald-900 dark:text-emerald-100',
              )}
            >
              {hint.kind === 'external' ? (
                <AlertTriangleIcon
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
              ) : (
                <ShieldCheckIcon
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              )}
              <span>{hint.text}</span>
            </p>
            <p
              className="line-clamp-2 break-all text-[11px] leading-relaxed text-fd-muted-foreground/80"
              title={absoluteUrl}
            >
              <span className="font-sans">目标链接：</span>
              <span className="font-mono">{absoluteUrl}</span>
            </p>
          </div>

          <div className="flex divide-x divide-fd-border/50 border-t border-fd-border/40">
            <LinkActionButton
              icon={<CopyIcon />}
              label="复制链接"
              onAction={async () => {
                await safeWriteClipboard(absoluteUrl);
              }}
              onClose={onClose}
              successLabel="复制成功"
            />
            <LinkActionButton
              icon={<SquareMousePointerIcon />}
              label="当前标签页访问"
              onAction={openSameTab}
              onClose={onClose}
            />
            <LinkActionButton
              icon={<SquareArrowUpRightIcon />}
              label="新建标签页访问"
              onAction={openNewTab}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    ) : null;

  return isClient && dialog ? createPortal(dialog, document.body) : null;
}

function LinkActionButton({
  icon,
  label,
  successLabel,
  onAction,
  onClose,
}: {
  icon: React.ReactNode;
  label: string;
  successLabel?: string;
  onAction: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        'flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-center text-xs transition-colors',
        'hover:bg-fd-accent hover:text-fd-accent-foreground',
        '[&_svg]:size-3.5 [&_svg]:shrink-0',
      )}
      onClick={() => {
        void Promise.resolve(onAction()).then(() => {
          if (successLabel) {
            setDone(true);
            window.setTimeout(() => {
              setDone(false);
              onClose();
            }, 900);
            return;
          }
          onClose();
        });
      }}
    >
      {done ? <CheckIcon className="text-green-600 dark:text-green-400" /> : icon}
      <span className="leading-none whitespace-nowrap">{done && successLabel ? successLabel : label}</span>
    </button>
  );
}
