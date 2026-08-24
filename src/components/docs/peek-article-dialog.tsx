'use client';

import {
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  PinIcon,
  SquareArrowOutUpRightIcon,
  XIcon,
} from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/lib/core/cn';
import { canonicalDocsHref } from '@/lib/docs/doc-peek';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { DocPeekSurfaceProvider, useDocPeek } from '@/components/docs/doc-peek-context';
import { PeekFloatingAnchors } from '@/components/docs/floating-anchors';
import { PeekArticleSkeleton, PeekLoadingHint } from '@/components/docs/peek-loading';

function SheetIconButton({
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
        'flex size-8 items-center justify-center rounded-md',
        'text-fd-muted-foreground transition-colors',
        'hover:bg-fd-muted hover:text-fd-foreground',
        'disabled:pointer-events-none disabled:opacity-30',
        pressed && 'bg-fd-muted text-fd-primary hover:text-fd-primary',
      )}
    >
      {children}
    </button>
  );
}

export function PeekArticleDialog({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const peek = useDocPeek();
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [copied, onCopy] = useCopyButton(() => {
    const target = peek?.target;
    if (!target) return;
    const href =
      typeof window === 'undefined'
        ? canonicalDocsHref(target.path, target.hash)
        : `${window.location.origin}${canonicalDocsHref(target.path, target.hash)}`;
    void safeWriteClipboard(href);
  });
  if (!peek?.target || peek.desktop) return null;

  const copyHref =
    typeof window === 'undefined'
      ? canonicalDocsHref(peek.target.path, peek.target.hash)
      : `${window.location.origin}${canonicalDocsHref(peek.target.path, peek.target.hash)}`;

  return (
    <RadixDialog.Root
      open
      onOpenChange={(next) => {
        if (!next) peek.closePeek();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-9998 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          aria-describedby={undefined}
          data-doc-peek-sheet=""
          className={cn(
            'fixed inset-3 z-9999 flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-background shadow-2xl',
            'sm:inset-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        >
          <header className="flex h-11 shrink-0 items-center gap-1 border-b border-fd-border/60 px-2">
            <RadixDialog.Title className="min-w-0 flex-1 truncate px-2 text-sm font-medium">
              {title}
            </RadixDialog.Title>
            <SheetIconButton
              label="后退"
              disabled={!peek.canPeekBack}
              onClick={() => peek.peekBack()}
            >
              <ArrowLeftIcon className="size-4.5" />
            </SheetIconButton>
            <SheetIconButton
              label="前进"
              disabled={!peek.canPeekForward}
              onClick={() => peek.peekForward()}
            >
              <ArrowRightIcon className="size-4.5" />
            </SheetIconButton>
            <SheetIconButton
              label={copied ? '已复制' : '复制链接'}
              onClick={onCopy}
            >
              {copied ? <CheckIcon className="size-4.5" /> : <CopyIcon className="size-4.5" />}
            </SheetIconButton>
            <SheetIconButton
              label={peek.pinned ? '取消固定' : '固定右栏'}
              pressed={peek.pinned}
              onClick={() => peek.togglePeekPin()}
            >
              <PinIcon
                className="size-4.5"
                fill={peek.pinned ? 'currentColor' : 'none'}
              />
            </SheetIconButton>
            <SheetIconButton
              label="新标签打开"
              onClick={() => {
                window.open(copyHref, '_blank', 'noopener,noreferrer');
              }}
            >
              <SquareArrowOutUpRightIcon className="size-4.5" />
            </SheetIconButton>
            <RadixDialog.Close asChild>
              <button
                type="button"
                title="关闭"
                aria-label="关闭"
                className="flex size-8 items-center justify-center rounded-md text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </RadixDialog.Close>
          </header>
          <div
            ref={setScrollEl}
            data-doc-peek-scroll=""
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <DocPeekSurfaceProvider surface="peek">
              {children ?? (peek.pending ? <PeekArticleSkeleton /> : null)}
            </DocPeekSurfaceProvider>
            {peek.pending && children ? <PeekLoadingHint overlay /> : null}
            <PeekFloatingAnchors scrollRoot={scrollEl} pageUrl={copyHref} />
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
