'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { getDocPageTitle } from '@/lib/docs/feedback/page-title';
import { buildDocsViewContext, type DocsViewClientContext } from '@/lib/docs/docs-view-context';

/** 在发送消息时读取：左栏主文档 + 右栏 peek（若打开） */
export function useDocsViewClientContext(): () => DocsViewClientContext {
  const pathname = usePathname() ?? '/';
  const peek = useDocPeek();
  const peekOpen = Boolean(peek?.target);
  const peekDesktop = Boolean(peek?.desktop);
  const rightPath = peek?.target?.path ?? null;
  const rightHash = peek?.target?.hash ?? '';

  return useCallback(() => {
    return buildDocsViewContext({
      href: window.location.href,
      origin: window.location.origin,
      leftPath: pathname,
      leftTitle: getDocPageTitle('main'),
      peekOpen,
      peekDesktop,
      rightPath,
      rightHash,
      rightTitle: peekOpen ? getDocPageTitle('peek') : undefined,
    });
  }, [pathname, peekOpen, peekDesktop, rightPath, rightHash]);
}
