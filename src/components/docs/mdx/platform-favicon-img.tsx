'use client';

import { useState } from 'react';
import { cn } from '@/lib/core/cn';

/** 站内平台 favicon；加载失败时隐藏（不占位）。 */
export function PlatformFaviconImg({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={18}
      height={18}
      referrerPolicy="no-referrer"
      className={cn('size-[18px] shrink-0 object-contain', className)}
      onError={() => setFailed(true)}
    />
  );
}
