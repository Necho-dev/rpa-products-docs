'use client';

import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Check, Copy, SquareArrowOutUpRight } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';

const TOOLBAR_ICON_CLASS = 'size-4 shrink-0';
const TOOLBAR_GAP = 8;
const TOOLBAR_VIEW_PAD = 8;
const TOOLBAR_EST_H = 40;
const TOOLBAR_BUTTON_W = 34;
const TOOLBAR_EST_PAD = 4;

function SplitPaneIcon() {
  return (
    <svg viewBox="0 0 16 16" className={TOOLBAR_ICON_CLASS} fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <rect x="8" y="2.75" width="5.25" height="10.5" rx="0.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function LeftPaneIcon() {
  return (
    <svg viewBox="0 0 16 16" className={TOOLBAR_ICON_CLASS} fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <rect x="2.75" y="2.75" width="5.25" height="10.5" rx="0.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function RightPaneIcon() {
  return (
    <svg viewBox="0 0 16 16" className={TOOLBAR_ICON_CLASS} fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <rect x="8" y="2.75" width="5.25" height="10.5" rx="0.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function FullPageIcon() {
  return (
    <svg viewBox="0 0 16 16" className={TOOLBAR_ICON_CLASS} fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="0.75" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md',
        'text-fd-muted-foreground transition-colors',
        'hover:bg-fd-muted hover:text-fd-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        '[&>svg]:size-4 [&>svg]:shrink-0',
      )}
    >
      {children}
    </button>
  );
}

function clipPortFor(el: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  const subnav = document.getElementById('nd-subnav');
  if (subnav) {
    const nav = subnav.getBoundingClientRect();
    if (nav.height > 0) top = Math.max(top, nav.bottom);
  }
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY !== 'visible') {
      const r = node.getBoundingClientRect();
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    node = node.parentElement;
  }
  return { top, bottom };
}

function placeHoverToolbar(
  card: DOMRect,
  clip: { top: number; bottom: number },
  bar: { width: number; height: number },
): { top: number; left: number } {
  const need = bar.height + TOOLBAR_GAP;
  const spaceAbove = card.top - clip.top;
  const spaceBelow = clip.bottom - card.bottom;
  const preferTop = spaceAbove >= need || (spaceAbove >= spaceBelow && spaceBelow < need);

  let top = preferTop ? card.top - TOOLBAR_GAP - bar.height : card.bottom + TOOLBAR_GAP;
  top = Math.min(
    Math.max(top, clip.top + TOOLBAR_VIEW_PAD),
    Math.max(clip.top + TOOLBAR_VIEW_PAD, clip.bottom - TOOLBAR_VIEW_PAD - bar.height),
  );

  let left = card.left + card.width / 2 - bar.width / 2;
  left = Math.min(
    Math.max(left, TOOLBAR_VIEW_PAD),
    Math.max(TOOLBAR_VIEW_PAD, window.innerWidth - TOOLBAR_VIEW_PAD - bar.width),
  );
  return { top, left };
}

/**
 * 卡片悬停浮窗：分屏 / 左栏 / 右栏 / 整屏 / 新标签 / 复制。
 * 必须作为 hover 目标节点的直接子元素（用 hidden sentinel 找 parentElement）。
 * 仅桌面（DocPeekProvider.desktop，≥1280px）渲染。
 */
export function DocsHoverToolbar({
  href,
  ariaLabel = '文档快捷操作',
}: {
  href: string;
  ariaLabel?: string;
}) {
  const peek = useDocPeek();
  const router = useRouter();
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>(0);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [copied, onCopy] = useCopyButton(() => {
    const abs = href.startsWith('http') ? href : `${window.location.origin}${href}`;
    void safeWriteClipboard(abs);
  });

  const splitOpen = Boolean(peek?.open);
  const buttonCount = splitOpen ? 5 : 3;

  const measure = useCallback(() => {
    const card = sentinelRef.current?.parentElement;
    if (!card) return;
    const barBox = barRef.current?.getBoundingClientRect();
    const bar = {
      width: barBox?.width || buttonCount * TOOLBAR_BUTTON_W + TOOLBAR_EST_PAD,
      height: barBox?.height || TOOLBAR_EST_H,
    };
    setPos(placeHoverToolbar(card.getBoundingClientRect(), clipPortFor(card), bar));
  }, [buttonCount]);

  const show = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 100);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
  }, [open, measure]);

  useEffect(() => {
    if (!peek?.desktop) return;
    const card = sentinelRef.current?.parentElement;
    if (!card) return;
    const onEnter = () => {
      show();
      measure();
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && (card.contains(next) || barRef.current?.contains(next))) return;
      hide();
    };
    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', hide);
    card.addEventListener('focusin', onEnter);
    card.addEventListener('focusout', onFocusOut);
    return () => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', hide);
      card.removeEventListener('focusin', onEnter);
      card.removeEventListener('focusout', onFocusOut);
    };
  }, [hide, measure, peek?.desktop, show]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => measure();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [measure, open]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  if (!href || !peek?.desktop) return null;

  const bar = (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={ariaLabel}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
      className="fixed z-70 flex items-center gap-0.5 rounded-lg border border-fd-border/70 bg-fd-background p-0.5 shadow-md"
    >
      {splitOpen ? (
        <>
          <ToolbarButton label="左栏打开" onClick={() => router.push(href)}>
            <LeftPaneIcon />
          </ToolbarButton>
          <ToolbarButton label="右栏打开" onClick={() => peek.openPeek(href, 'main')}>
            <RightPaneIcon />
          </ToolbarButton>
          <ToolbarButton label="整屏打开" onClick={() => peek.openFullPage(href)}>
            <FullPageIcon />
          </ToolbarButton>
        </>
      ) : (
        <ToolbarButton label="分屏打开" onClick={() => peek.openPeek(href, 'main')}>
          <SplitPaneIcon />
        </ToolbarButton>
      )}
      <ToolbarButton
        label="新标签页打开"
        onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
      >
        <SquareArrowOutUpRight className={TOOLBAR_ICON_CLASS} strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton label={copied ? '已复制' : '复制链接'} onClick={onCopy}>
        {copied ? (
          <Check className={TOOLBAR_ICON_CLASS} strokeWidth={2} />
        ) : (
          <Copy className={TOOLBAR_ICON_CLASS} strokeWidth={2} />
        )}
      </ToolbarButton>
    </div>
  );

  return (
    <>
      <span ref={sentinelRef} className="hidden" aria-hidden />
      {open && typeof document !== 'undefined' ? createPortal(bar, document.body) : null}
    </>
  );
}
