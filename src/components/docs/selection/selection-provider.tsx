'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SharePosterDialog } from '@/components/docs/share-poster-dialog';
import { SelectionShareLoading, SelectionToolbar } from '@/components/docs/selection/selection-toolbar';
import { useAISearchContext } from '@/components/ai/search';
import {
  applyHighlightFromRange,
  applyHighlightsToContainer,
  collectHighlightSegments,
  getHighlightCombinedText,
  getHighlightUnionRect,
  rangeFromHighlightSegments,
  unwrapHighlightMark,
} from '@/lib/docs/selection/apply-highlights';
import { fetchQuotePosterUrl } from '@/lib/docs/selection/fetch-quote-poster-url';
import {
  clearNativeSelection,
  extractTextQuote,
  findProseContainer,
  readSelectionInContainer,
  type SelectionSnapshot,
} from '@/lib/docs/selection/get-selection-in-container';
import {
  createHighlight,
  idbDeleteHighlight,
  idbFindHighlightByQuote,
  idbGetHighlightById,
  idbListHighlightsForPage,
  idbPutHighlight,
} from '@/lib/docs/selection/highlight-idb';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { docsRoute } from '@/lib/core/shared';

const HIGHLIGHT_CLICK_SUPPRESS_MS = 120;

function docsPathFromPathname(pathname: string): string | null {
  if (pathname === `${docsRoute}/access`) return null;
  if (pathname === docsRoute || pathname.startsWith(`${docsRoute}/`)) {
    return pathname;
  }
  return null;
}

function slugsFromPathname(pathname: string): string[] {
  if (pathname === docsRoute) return [];
  const rest = pathname.slice(`${docsRoute}/`.length);
  return rest ? rest.split('/').filter(Boolean) : [];
}

function clampToolbarPosition(rect: DOMRect): { top: number; left: number } {
  const padding = 12;
  const left = Math.min(Math.max(rect.left + rect.width / 2, padding), window.innerWidth - padding);
  const top = Math.max(rect.top, padding + 48);
  return { top, left };
}

function getPageTitle(): string | undefined {
  const h1 = document.querySelector<HTMLElement>('#nd-page h1');
  return h1?.textContent?.trim() || undefined;
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isToolbarTarget(target: EventTarget | null): boolean {
  return Boolean(
    (target as HTMLElement | null)?.closest('[role="toolbar"][aria-label="选区操作"]'),
  );
}

function isDialogTarget(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest('[role="dialog"]'));
}

function getHighlightIdFromTarget(target: EventTarget | null): string | null {
  const el = (target as HTMLElement | null)?.closest('[data-doc-highlight]');
  const id = el?.getAttribute('data-doc-highlight');
  return id || null;
}

function hasActiveTextSelection(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return false;
  return normalizeSpaces(sel.toString()).length >= 2;
}

export function DocSelectionProvider() {
  const pathname = usePathname();
  const pagePath = docsPathFromPathname(pathname);

  if (!pagePath) return null;

  return <DocSelectionProviderInner key={pagePath} pagePath={pagePath} />;
}

function DocSelectionProviderInner({ pagePath }: { pagePath: string }) {
  const { openWithSelection } = useAISearchContext();

  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const selectionRef = useRef<SelectionSnapshot | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSelectionHideUntilRef = useRef(0);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [copyState, setCopyState] = useState<'idle' | 'ok'>('idle');
  const [existingHighlightId, setExistingHighlightId] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [sharePosterUrl, setSharePosterUrl] = useState('');
  const [sharePageUrl, setSharePageUrl] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareDescription, setShareDescription] = useState<string | undefined>();

  const hideToolbar = useCallback(() => {
    setSelection(null);
    setCopyState('idle');
    setExistingHighlightId(null);
  }, []);

  const openToolbarForHighlight = useCallback((highlightId: string) => {
    const container = findProseContainer();
    if (!container) return false;

    const segments = collectHighlightSegments(highlightId, container);
    if (segments.length === 0) return false;

    const text = normalizeSpaces(getHighlightCombinedText(segments));
    if (text.length < 2) return false;

    const rect = getHighlightUnionRect(segments);
    const range = rangeFromHighlightSegments(segments);
    if (!range) return false;

    const quote = extractTextQuote(container, range);

    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    setCopyState('idle');
    setSelection({
      text,
      rect,
      range,
      exact: quote.exact,
      prefix: quote.prefix,
      suffix: quote.suffix,
      sameBlock: segments.length === 1,
    });
    setToolbarPos(clampToolbarPosition(rect));
    setExistingHighlightId(highlightId);
    clearNativeSelection();

    void idbGetHighlightById(highlightId).then((record) => {
      if (!record) return;
      setSelection((prev) => {
        if (!prev || prev.exact !== quote.exact) return prev;
        return {
          ...prev,
          exact: record.exact,
          prefix: record.prefix,
          suffix: record.suffix,
        };
      });
    });

    return true;
  }, []);

  const refreshSelection = useCallback(async () => {
    if (Date.now() < suppressSelectionHideUntilRef.current) return;

    const container = findProseContainer();
    const snap = readSelectionInContainer(container);
    if (!snap) {
      hideToolbar();
      return;
    }

    if (selectionRef.current?.exact !== snap.exact) {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      setCopyState('idle');
    }

    setSelection(snap);
    setToolbarPos(clampToolbarPosition(snap.rect));

    const existing = await idbFindHighlightByQuote(
      pagePath,
      snap.exact,
      snap.prefix,
      snap.suffix,
    );
    setExistingHighlightId(existing?.id ?? null);
  }, [pagePath, hideToolbar]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refreshSelection();
      }, 50);
    };

    const activateHighlightClick = (target: EventTarget | null) => {
      const highlightId = getHighlightIdFromTarget(target);
      if (!highlightId || hasActiveTextSelection()) return false;

      suppressSelectionHideUntilRef.current = Date.now() + HIGHLIGHT_CLICK_SUPPRESS_MS;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      return openToolbarForHighlight(highlightId);
    };

    const onClick = (e: MouseEvent) => {
      if (isToolbarTarget(e.target)) return;
      if (isDialogTarget(e.target)) return;
      if (!getHighlightIdFromTarget(e.target)) return;
      if (hasActiveTextSelection()) return;

      e.preventDefault();
      e.stopPropagation();
      activateHighlightClick(e.target);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isToolbarTarget(e.target)) return;
      // 在已划线区域结束选区时仍需刷新工具栏
      if (getHighlightIdFromTarget(e.target) && !hasActiveTextSelection()) return;
      scheduleRefresh();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isToolbarTarget(e.target)) return;
      const highlightId = getHighlightIdFromTarget(e.target);
      if (highlightId && !hasActiveTextSelection()) {
        activateHighlightClick(e.target);
        return;
      }
      scheduleRefresh();
    };

    const onSelectionChange = () => {
      if (Date.now() < suppressSelectionHideUntilRef.current) return;

      if (!selectionRef.current) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) hideToolbar();
        return;
      }

      const container = findProseContainer();
      const snap = readSelectionInContainer(container);
      if (snap) {
        setSelection(snap);
        setToolbarPos(clampToolbarPosition(snap.rect));
      }
    };

    const onScroll = () => hideToolbar();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideToolbar();
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target;
      if (isToolbarTarget(target)) return;
      if (isDialogTarget(target)) return;

      if (getHighlightIdFromTarget(target)) {
        if ('button' in e && e.button === 0) e.preventDefault();
        return;
      }

      hideToolbar();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: false });
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [hideToolbar, refreshSelection, openToolbarForHighlight]);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const highlights = await idbListHighlightsForPage(pagePath);
      if (cancelled || highlights.length === 0) return;
      const container = findProseContainer();
      if (!container) return;
      applyHighlightsToContainer(container, highlights);
    };

    void restore();
    const retry = window.setTimeout(() => void restore(), 400);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
    };
  }, [pagePath]);

  const handleHighlight = useCallback(async () => {
    if (!selection) return;
    const container = findProseContainer();
    if (!container) return;

    if (existingHighlightId) {
      await idbDeleteHighlight(existingHighlightId);
      container
        .querySelectorAll(`[data-doc-highlight="${existingHighlightId}"]`)
        .forEach((el) => unwrapHighlightMark(el));
      hideToolbar();
      clearNativeSelection();
      return;
    }

    const highlight = createHighlight({
      pagePath,
      exact: selection.exact,
      prefix: selection.prefix,
      suffix: selection.suffix,
      color: 'yellow',
    });

    await idbPutHighlight(highlight);
    applyHighlightFromRange(container, highlight, selection.range);
    hideToolbar();
    clearNativeSelection();
  }, [selection, pagePath, existingHighlightId, hideToolbar]);

  const handleShare = useCallback(async () => {
    if (!selection) return;

    setShareLoading(true);
    hideToolbar();
    clearNativeSelection();

    try {
      const slugs = slugsFromPathname(pagePath);
      const pageTitle = getPageTitle() ?? '文档摘录';
      const result = await fetchQuotePosterUrl({
        slugs,
        text: selection.text,
        pageUrl: window.location.href.split('#')[0],
      });

      setShareTitle(pageTitle);
      setShareDescription(selection.text.length > 120 ? `${selection.text.slice(0, 119)}…` : selection.text);
      setSharePosterUrl(result.posterUrl);
      setSharePageUrl(result.pageUrl);
      setShareOpen(true);
    } catch (err) {
      console.error('[SelectionShare]', err);
    } finally {
      setShareLoading(false);
    }
  }, [selection, pagePath, hideToolbar]);

  const handleAskAi = useCallback(() => {
    if (!selection) return;
    openWithSelection({
      text: selection.text,
      pageUrl: window.location.href,
      pageTitle: getPageTitle(),
    });
    hideToolbar();
    clearNativeSelection();
  }, [selection, openWithSelection, hideToolbar]);

  const handleCopy = useCallback(() => {
    if (!selection) return;
    void safeWriteClipboard(selection.text).then(() => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      setCopyState('ok');
      copyResetTimerRef.current = setTimeout(() => {
        setCopyState('idle');
        copyResetTimerRef.current = null;
      }, 2000);
    });
  }, [selection]);

  return (
    <>
      <SelectionToolbar
        visible={selection !== null}
        position={toolbarPos}
        canHighlight={Boolean(selection)}
        hasExistingHighlight={Boolean(existingHighlightId)}
        onHighlight={() => void handleHighlight()}
        onShare={() => void handleShare()}
        onAskAi={handleAskAi}
        onCopy={handleCopy}
        onClose={hideToolbar}
        copyState={copyState}
      />
      {shareLoading ? <SelectionShareLoading /> : null}
      <SharePosterDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        dialogLabel="分享摘录"
        title={shareTitle}
        description={shareDescription}
        pageUrl={sharePageUrl}
        posterUrl={sharePosterUrl}
        downloadFileName="doc-quote-share.png"
      />
    </>
  );
}
