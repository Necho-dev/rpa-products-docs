'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

function applyIfEmpty(fallback: string) {
  if (!document.title?.trim()) document.title = fallback;
}

export function DocumentTitleDefault({ defaultTitle }: { defaultTitle: string }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    applyIfEmpty(defaultTitle);
    const raf = requestAnimationFrame(() => applyIfEmpty(defaultTitle));
    const t32 = window.setTimeout(() => applyIfEmpty(defaultTitle), 32);
    const t120 = window.setTimeout(() => applyIfEmpty(defaultTitle), 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t32);
      window.clearTimeout(t120);
    };
  }, [pathname, defaultTitle]);

  return null;
}
