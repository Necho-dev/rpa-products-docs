'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/core/cn';

export type IconTooltipProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** 首选方向；空间不够时翻到另一侧，避免盖住上方工具条 */
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
const TOOLTIP_GAP = 8;
const TOOLTIP_ESTIMATED_HEIGHT = 48;

export function IconTooltip({
  label,
  children,
  className,
  contentClassName,
  placement = 'top',
  align = 'end',
}: IconTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<'top' | 'bottom'>(placement);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const need = TOOLTIP_ESTIMATED_HEIGHT + TOOLTIP_GAP;
    let next = placement;
    if (placement === 'top' && spaceAbove < need && spaceBelow > spaceAbove) next = 'bottom';
    if (placement === 'bottom' && spaceBelow < need && spaceAbove > spaceBelow) next = 'top';
    setResolvedPlacement(next);
    const top = next === 'top' ? rect.top - TOOLTIP_GAP : rect.bottom + TOOLTIP_GAP;
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
              resolvedPlacement === 'top' ? '-translate-y-full' : '',
              align === 'end' ? '-translate-x-full' : '-translate-x-1/2',
              contentClassName,
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
