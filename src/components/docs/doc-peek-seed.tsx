'use client';

import { useLayoutEffect, useRef } from 'react';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import type { DocPeekTarget } from '@/lib/docs/doc-peek';

function peekTargetKey(target: DocPeekTarget | null): string | null {
  if (!target) return null;
  return `${target.path}${target.hash}`;
}

/** 把分享链接上的 ?peek= 写入右栏栈；须放在 DocPeekProvider 内、与 SSR PeekArticle 同页 */
export function DocPeekSeed({ target }: { target: DocPeekTarget | null }) {
  const peek = useDocPeek();
  const lastKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!peek) return;
    if (!target) {
      lastKey.current = null;
      return;
    }
    const key = peekTargetKey(target);
    if (!key || lastKey.current === key) return;
    lastKey.current = key;
    peek.hydrate(target);
  }, [peek, target]);

  return null;
}
