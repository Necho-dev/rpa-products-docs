'use client';

import { useState } from 'react';
import { cn } from '@/lib/core/cn';
import {
  formatDurationVariant,
  getDurationDisplayVariants,
} from '@/lib/docs/format-schedule-meta';

export function DurationDisplay({
  sec,
  className,
}: {
  sec: number;
  className?: string;
}) {
  const variants = getDurationDisplayVariants(sec);
  const [index, setIndex] = useState(0);
  const current = variants[index % variants.length]!;
  const label = formatDurationVariant(current);
  const canCycle = variants.length > 1;

  if (!canCycle) {
    return (
      <span className={cn('tabular-nums', className)}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'tabular-nums cursor-pointer rounded px-0.5 -mx-0.5',
        'hover:bg-fd-foreground/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fd-ring',
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) => (i + 1) % variants.length);
      }}
      title="点击切换单位"
      aria-label={`${label}，点击切换单位`}
    >
      {label}
    </button>
  );
}
