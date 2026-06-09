'use client';

import { createPortal } from 'react-dom';
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  HighlighterIcon,
  Loader2Icon,
  MessageSquareWarningIcon,
  Share2Icon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

export type SelectionToolbarProps = {
  visible: boolean;
  position: { top: number; left: number };
  canHighlight: boolean;
  hasExistingHighlight: boolean;
  onHighlight: () => void;
  onShare: () => void;
  onFeedback?: () => void;
  onAskAi: () => void;
  onCopy: () => void;
  onClose: () => void;
  copyState: 'idle' | 'ok';
};

export function SelectionToolbar({
  visible,
  position,
  canHighlight,
  hasExistingHighlight,
  onHighlight,
  onShare,
  onFeedback,
  onAskAi,
  onCopy,
  onClose,
  copyState,
}: SelectionToolbarProps) {
  if (!visible) return null;

  const toolbar = (
    <div
      role="toolbar"
      aria-label="选区操作"
      className={cn(
        'fixed z-9998 flex items-center gap-0.5 rounded-lg border py-0.5 px-1 backdrop-blur-sm',
        'border-fd-border/80 bg-fd-popover/95 text-fd-popover-foreground shadow-lg',
        'dark:border-white/14 dark:bg-[hsl(220_14%_20%/0.98)]',
        'dark:shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:text-[hsl(210_28%_93%)]',
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {canHighlight ? (
        <ToolbarButton
          icon={<HighlighterIcon className="size-3.5" />}
          label={hasExistingHighlight ? '取消划线' : '划线'}
          onClick={onHighlight}
        />
      ) : null}
      <ToolbarButton
        icon={<Share2Icon className="size-3.5" />}
        label="分享"
        onClick={onShare}
      />
      {onFeedback ? (
        <ToolbarButton
          icon={<MessageSquareWarningIcon className="size-3.5" />}
          label="反馈"
          onClick={onFeedback}
        />
      ) : null}
      <ToolbarButton
        icon={<BotIcon className="size-3.5" />}
        label="问 AI"
        onClick={onAskAi}
      />
      <ToolbarButton
        icon={
          copyState === 'ok' ? (
            <CheckIcon className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <CopyIcon className="size-3.5 shrink-0" />
          )
        }
        label="复制"
        onClick={onCopy}
        active={copyState === 'ok'}
      />
      <button
        type="button"
        title="关闭"
        onClick={onClose}
        className="ml-0.5 flex size-6 items-center justify-center rounded-md text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );

  return createPortal(toolbar, document.body);
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        buttonVariants({ color: 'ghost', size: 'sm' }),
        'h-7 min-w-16 gap-1 px-2 text-xs font-medium',
        'dark:hover:bg-white/10 dark:hover:text-white',
        active && 'text-fd-muted-foreground dark:text-white/70',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SelectionShareLoading() {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 rounded-xl border border-fd-border bg-fd-card px-4 py-3 shadow-lg">
        <Loader2Icon className="size-5 animate-spin text-fd-primary" />
        <span className="text-sm text-fd-foreground">正在生成分享图…</span>
      </div>
    </div>,
    document.body,
  );
}
