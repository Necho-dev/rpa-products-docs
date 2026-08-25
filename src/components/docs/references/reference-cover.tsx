'use client';

import { useState } from 'react';
import { cn } from '@/lib/core/cn';

export function ReferenceCover({
  src,
  className,
  imgClassName,
}: {
  src: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return null;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-fd-muted/80',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={cn('max-h-full max-w-full object-cover', imgClassName)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
