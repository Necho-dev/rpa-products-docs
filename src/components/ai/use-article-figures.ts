'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  collectArticleFiguresFromRoot,
  type ArticleFigure,
} from '@/lib/ai/chat-vision';

export function useArticleFigures(enabled: boolean): ArticleFigure[] {
  const pathname = usePathname();
  const [figures, setFigures] = useState<ArticleFigure[]>([]);

  useEffect(() => {
    if (!enabled) {
      setFigures([]);
      return;
    }

    const scan = () => setFigures(collectArticleFiguresFromRoot(document));
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled, pathname]);

  return figures;
}
