'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { unwrapHighlightMark } from '@/lib/docs/selection/apply-highlights';
import { findProseContainer } from '@/lib/docs/selection/get-selection-in-container';
import {
  idbDeleteHighlight,
  idbListAllHighlights,
  subscribeHighlightChanges,
  type DocHighlight,
} from '@/lib/docs/selection/highlight-idb';
import { locateAndScrollToHighlight } from '@/lib/docs/selection/scroll-to-highlight';
import { docsRoute } from '@/lib/core/shared';

type ExcerptCollectionContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  pagePath: string | null;
  highlights: DocHighlight[];
  currentPageHighlights: DocHighlight[];
  otherHighlights: DocHighlight[];
  refresh: () => Promise<void>;
  navigateToHighlight: (highlight: DocHighlight) => Promise<void>;
  deleteHighlight: (highlight: DocHighlight) => Promise<void>;
  deleteConfirmId: string | null;
  openDeleteConfirm: (id: string) => void;
  closeDeleteConfirm: () => void;
  locateError: string | null;
  clearLocateError: () => void;
  reportLocateError: (message: string) => void;
};

const ExcerptCollectionContext = createContext<ExcerptCollectionContextValue | null>(null);

export function docsPathFromPathname(pathname: string): string | null {
  if (pathname === `${docsRoute}/access`) return null;
  if (pathname === docsRoute || pathname.startsWith(`${docsRoute}/`)) {
    return pathname;
  }
  return null;
}

export function ExcerptCollectionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pagePath = docsPathFromPathname(pathname);

  const [open, setOpenState] = useState(false);
  const [highlights, setHighlights] = useState<DocHighlight[]>([]);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setDeleteConfirmId(null);
  }, []);

  const openDeleteConfirm = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const refresh = useCallback(async () => {
    const list = await idbListAllHighlights();
    setHighlights(list);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const list = await idbListAllHighlights();
      if (!cancelled) setHighlights(list);
    };

    void load();

    const unsubscribe = subscribeHighlightChanges(() => {
      void load();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const { currentPageHighlights, otherHighlights } = useMemo(() => {
    if (!pagePath) {
      return { currentPageHighlights: [], otherHighlights: highlights };
    }
    const currentPageHighlights = highlights.filter((h) => h.pagePath === pagePath);
    const otherHighlights = highlights.filter((h) => h.pagePath !== pagePath);
    return { currentPageHighlights, otherHighlights };
  }, [highlights, pagePath]);

  const clearLocateError = useCallback(() => setLocateError(null), []);
  const reportLocateError = useCallback((message: string) => setLocateError(message), []);

  const navigateToHighlight = useCallback(
    async (highlight: DocHighlight) => {
      setLocateError(null);
      setDeleteConfirmId(null);

      if (pagePath === highlight.pagePath) {
        setOpen(false);
        const ok = await locateAndScrollToHighlight(highlight);
        if (!ok) {
          setLocateError('原文已变更，无法定位到划线位置');
          setOpen(true);
        }
        return;
      }

      setOpen(false);
      router.push(`${highlight.pagePath}?hl=${encodeURIComponent(highlight.id)}`);
    },
    [pagePath, router, setOpen],
  );

  const deleteHighlight = useCallback(
    async (highlight: DocHighlight) => {
      await idbDeleteHighlight(highlight.id);
      setDeleteConfirmId(null);

      if (pagePath === highlight.pagePath) {
        const container = findProseContainer();
        container
          ?.querySelectorAll(`[data-doc-highlight="${highlight.id}"]`)
          .forEach((el) => unwrapHighlightMark(el));
      }

      await refresh();
    },
    [pagePath, refresh],
  );

  const value = useMemo<ExcerptCollectionContextValue>(
    () => ({
      open,
      setOpen,
      pagePath,
      highlights,
      currentPageHighlights,
      otherHighlights,
      refresh,
      navigateToHighlight,
      deleteHighlight,
      deleteConfirmId,
      openDeleteConfirm,
      closeDeleteConfirm,
      locateError,
      clearLocateError,
      reportLocateError,
    }),
    [
      open,
      setOpen,
      pagePath,
      highlights,
      currentPageHighlights,
      otherHighlights,
      refresh,
      navigateToHighlight,
      deleteHighlight,
      deleteConfirmId,
      openDeleteConfirm,
      closeDeleteConfirm,
      locateError,
      clearLocateError,
      reportLocateError,
    ],
  );

  return (
    <ExcerptCollectionContext.Provider value={value}>{children}</ExcerptCollectionContext.Provider>
  );
}

export function useExcerptCollection(): ExcerptCollectionContextValue {
  const ctx = useContext(ExcerptCollectionContext);
  if (!ctx) {
    throw new Error('useExcerptCollection must be used within ExcerptCollectionProvider');
  }
  return ctx;
}

export function useExcerptCollectionOptional(): ExcerptCollectionContextValue | null {
  return useContext(ExcerptCollectionContext);
}
