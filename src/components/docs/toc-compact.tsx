'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { isCompactPaneWidth, measureVisiblePaneWidth } from '@/lib/docs/toc-compact';

export {
  isCompactPaneWidth,
  TOC_COMPACT_MAX_PX,
  TOC_COMPACT_WIDTH,
  TOC_FULL_WIDTH,
} from '@/lib/docs/toc-compact';

function useCompactColumn(side: 'left' | 'right', dragging: boolean) {
  const peek = useDocPeek();
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 80rem)');
    const layout = document.getElementById('nd-notebook-layout');
    const page = document.getElementById('nd-page');
    const peekEl = document.querySelector('[data-doc-peek-panel]');
    const update = () => {
      if (!desktop.matches) {
        setNarrow(false);
        return;
      }
      setNarrow((prev) => isCompactPaneWidth(measureVisiblePaneWidth(side), prev));
    };
    update();
    const ro = new ResizeObserver(update);
    if (layout) ro.observe(layout);
    if (page) ro.observe(page);
    if (peekEl instanceof HTMLElement) ro.observe(peekEl);
    desktop.addEventListener('change', update);

    if (!dragging) {
      return () => {
        ro.disconnect();
        desktop.removeEventListener('change', update);
      };
    }
    let raf = 0;
    const loop = () => {
      update();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      desktop.removeEventListener('change', update);
    };
  }, [side, dragging, peek?.open]);

  return narrow;
}

export function useColumnCompact(side: 'left' | 'right' = 'left') {
  const peek = useDocPeek();
  return useCompactColumn(side, Boolean(peek?.splitDragging));
}

function stampMainTocCompact(compact: boolean) {
  const toc = document.getElementById('nd-toc');
  if (compact) toc?.setAttribute('data-toc-compact', '');
  else toc?.removeAttribute('data-toc-compact');
}

/**
 * 折叠态打在持久的 layout 上。#nd-toc 随路由整节点替换，不能只打一次。
 */
export function MainTocCompact() {
  const compact = useColumnCompact('left');
  const pathname = usePathname();

  useLayoutEffect(() => {
    stampMainTocCompact(compact);
    const layout = document.getElementById('nd-notebook-layout');
    if (!layout) return;
    const mo = new MutationObserver(() => stampMainTocCompact(compact));
    mo.observe(layout, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [compact, pathname]);

  useEffect(
    () => () => {
      stampMainTocCompact(false);
    },
    [],
  );

  return null;
}
