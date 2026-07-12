'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/core/cn';

export type IconTooltipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  /** 向上（默认）或向下弹出 */
  placement?: 'top' | 'bottom';
  /** 右对齐适用于搜索栏右侧图标，避免被 32px 父容器挤成竖排 */
  align?: 'center' | 'end';
};

type TooltipCoords = {
  top: number;
  left: number;
};

/**
 * 图标旁悬浮提示：通过 portal 挂到 body，避免被 Dialog 的 overflow-hidden 裁切。
 */
export function IconTooltip({
  label,
  children,
  className,
  placement = 'top',
  align = 'end',
}: IconTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8;
    const left = align === 'end' ? rect.right : rect.left + rect.width / 2;
    setCoords({ top, left });
  }, [align, placement]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline-flex shrink-0', className)}
      onMouseEnter={() => {
        updatePosition();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => {
        updatePosition();
        setOpen(true);
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      {children}
      {open &&
        coords &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className={cn(
              'pointer-events-none fixed z-9999 w-max min-w-44 max-w-60',
              'rounded-md border border-fd-border bg-fd-popover px-2.5 py-1.5',
              'text-left text-xs leading-relaxed text-fd-popover-foreground shadow-lg',
              placement === 'top' ? '-translate-y-full' : '',
              align === 'end' ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
