'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { createOpenDocToolExecutors } from '@/lib/docs/open-doc-ai-tools';
import { setOpenDocToolExecutors } from '@/lib/docs/open-doc-ai-tools-registry';

/** 注册「打开文档页」client tool，供对话确认后执行。 */
export function OpenDocAiToolsBridge() {
  const peek = useDocPeek();
  const router = useRouter();
  const peekRef = useRef(peek);
  const routerRef = useRef(router);
  peekRef.current = peek;
  routerRef.current = router;

  useEffect(() => {
    setOpenDocToolExecutors({
      openDocumentationPage: (input) => {
        const peekNow = peekRef.current;
        return createOpenDocToolExecutors({
          openPeek: peekNow
            ? (href) => {
                peekNow.openPeek(href, 'main');
              }
            : null,
          openMain: (href) => {
            if (peekNow) peekNow.openFullPage(href);
            else routerRef.current.push(href);
          },
        }).openDocumentationPage(input);
      },
    });
    return () => setOpenDocToolExecutors(null);
  }, []);

  return null;
}
