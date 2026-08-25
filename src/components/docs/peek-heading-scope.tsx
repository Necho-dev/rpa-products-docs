'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { applyHeadingScope, PEEK_HEADING_ID_PREFIX } from '@/lib/docs/peek-heading-id';
import { cn } from '@/lib/core/cn';

export function PeekHeadingScope({
  ids,
  prefix = PEEK_HEADING_ID_PREFIX,
  className,
  children,
}: {
  ids: readonly string[];
  prefix?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = `${prefix}\0${ids.join('\0')}`;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    applyHeadingScope(root, ids, prefix);
    // ids/prefix represented by key so the scope re-runs when the article changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div ref={ref} className={cn('flex min-h-full min-w-0 flex-1 flex-col', className)}>
      {children}
    </div>
  );
}
