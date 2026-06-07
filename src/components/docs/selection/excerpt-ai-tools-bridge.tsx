'use client';

import { useEffect, useMemo } from 'react';
import { useAISearchContext } from '@/components/ai/search';
import {
  docsPathFromPathname,
  useExcerptCollectionOptional,
} from '@/components/docs/selection/excerpt-collection-context';
import {
  createExcerptToolExecutors,
  type ExcerptToolDeps,
} from '@/lib/docs/selection/excerpt-ai-tools';
import { setExcerptToolExecutors } from '@/lib/docs/selection/excerpt-ai-tools-registry';
import { usePathname } from 'next/navigation';

/** 注册摘录集 client-side tool executors，供 AISearch onToolCall 使用。 */
export function ExcerptAiToolsBridge() {
  const pathname = usePathname();
  const pagePath = docsPathFromPathname(pathname);
  const excerptCollection = useExcerptCollectionOptional();
  const { selectionContext } = useAISearchContext();

  const deps = useMemo<ExcerptToolDeps>(
    () => ({
      getPagePath: () => pagePath,
      getSelectionContext: () => selectionContext,
      refreshCollection: async () => {
        await excerptCollection?.refresh();
      },
    }),
    [pagePath, selectionContext, excerptCollection],
  );

  useEffect(() => {
    if (!excerptCollection) {
      setExcerptToolExecutors(null);
      return;
    }

    const executors = createExcerptToolExecutors({
      ...deps,
      getSelectionContext: () => selectionContext,
      refreshCollection: () => excerptCollection.refresh(),
    });

    setExcerptToolExecutors(executors);
    return () => setExcerptToolExecutors(null);
  }, [deps, excerptCollection, selectionContext]);

  return null;
}
