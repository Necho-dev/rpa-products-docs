'use client';

import { useLayoutEffect, useState, type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { Header as NotebookHeader } from 'fumadocs-ui/layouts/notebook/slots/header';
import { CategoryNavBar } from '@/components/docs/category-nav-bar';
import { useCategoryNav } from '@/components/docs/category-nav-context';

/** 二次导航挂进 #nd-subnav，与分区 Tab 同一顶栏，侧栏从整块顶栏下方开始 */
export function DocsHeader(props: ComponentProps<'header'>) {
  const { model } = useCategoryNav();
  const extra = model?.placement === 'header';
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!extra) {
      setHost(null);
      return;
    }
    setHost(document.getElementById('nd-subnav'));
  }, [extra]);

  return (
    <>
      <NotebookHeader {...props} />
      {extra && host
        ? createPortal(
            <CategoryNavBar className="max-lg:hidden" />,
            host,
          )
        : null}
    </>
  );
}
