'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  findAnchorInRoot,
  handleDocsAnchorClick,
  hashIdFromHref,
  resetDocsScrollToTop,
  smoothScrollToElement,
} from '@/lib/docs/smooth-scroll-to-anchor';

/** 文档区目录 / 页内锚点：捕获点击并平滑滚动（含双栏各自滚动容器）。 */
export function DocsSmoothHashNav() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      handleDocsAnchorClick(event);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useLayoutEffect(() => {
    const id = hashIdFromHref(window.location.hash, window.location.href);
    if (!id) {
      resetDocsScrollToTop();
      return;
    }

    const scrollToHash = () => {
      const page = document.getElementById('nd-page') ?? document;
      const heading = findAnchorInRoot(id, page);
      if (!heading) return false;
      smoothScrollToElement(heading, { block: 'start' });
      return true;
    };

    if (scrollToHash()) return;
    const timer = window.setTimeout(() => {
      scrollToHash();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
