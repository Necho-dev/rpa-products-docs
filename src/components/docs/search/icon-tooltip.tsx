'use client';

import type { ReactNode } from 'react';
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

export function IconTooltip({
  label,
  children,
  className,
  placement = 'top',
  align = 'end',
}: IconTooltipProps) {
  return (
    <span className={cn('group/icon-tip relative inline-flex shrink-0', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden w-max min-w-44 max-w-60',
          'rounded-md border border-fd-border bg-fd-popover px-2.5 py-1.5',
          'text-left text-xs leading-relaxed text-fd-popover-foreground shadow-lg',
          'group-hover/icon-tip:block group-focus-within/icon-tip:block',
          placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        )}
      >
        {label}
      </span>
    </span>
  );
}
