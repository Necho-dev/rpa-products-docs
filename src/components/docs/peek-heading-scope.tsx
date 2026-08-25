'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { applyPeekHeadingScope } from '@/lib/docs/peek-heading-id';

export function PeekHeadingScope({
  ids,
  children,
}: {
  ids: readonly string[];
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = ids.join('\0');

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    applyPeekHeadingScope(root, ids);
    // ids is represented by key so the scope re-runs when the peek article changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div ref={ref} className="flex min-h-full min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}
