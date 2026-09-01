'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/core/cn';

export type LinkPreviewPayload = {
  title: string;
  description: string | null;
  coverUrl: string | null;
  url: string;
};

const cache = new Map<string, LinkPreviewPayload | null>();
const CACHE_MAX = 80;
const CARD_WIDTH = 288;
const VIEW_PAD = 8;
const ANCHOR_GAP = 8;

function cacheSet(path: string, value: LinkPreviewPayload | null) {
  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(path, value);
}

function placeCard(
  anchor: DOMRect,
  card: { width: number; height: number },
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxLeft = Math.max(VIEW_PAD, vw - VIEW_PAD - card.width);
  let left = Math.min(Math.max(anchor.left, VIEW_PAD), maxLeft);

  const spaceAbove = anchor.top - VIEW_PAD - ANCHOR_GAP;
  const spaceBelow = vh - VIEW_PAD - ANCHOR_GAP - anchor.bottom;
  const preferAbove = spaceAbove >= card.height || spaceAbove >= spaceBelow;

  let top = preferAbove
    ? anchor.top - ANCHOR_GAP - card.height
    : anchor.bottom + ANCHOR_GAP;

  top = Math.min(Math.max(top, VIEW_PAD), Math.max(VIEW_PAD, vh - VIEW_PAD - card.height));
  left = Math.min(Math.max(left, VIEW_PAD), maxLeft);
  return { top, left };
}

export function DocsLinkHoverCard({
  path,
  onBrowse,
  anchorRef,
  onMouseEnter,
  onMouseLeave,
}: {
  path: string;
  onBrowse: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [payload, setPayload] = useState<LinkPreviewPayload | null | undefined>(cache.get(path));
  const [coverFailed, setCoverFailed] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titleId = useId();

  // 切换目标链接时在渲染期重置，避免 effect 内同步 setState 造成级联渲染。
  const [loadedPath, setLoadedPath] = useState(path);
  if (loadedPath !== path) {
    setLoadedPath(path);
    setCoverFailed(false);
    setPayload(cache.get(path));
  }

  useEffect(() => {
    if (cache.get(path) !== undefined) return;
    const ac = new AbortController();
    abortRef.current = ac;
    const timer = window.setTimeout(() => {
      void fetch(`/api/docs/link-preview?path=${encodeURIComponent(path)}`, { signal: ac.signal })
        .then(async (res) => {
          if (res.status === 403 || res.status === 404) {
            cacheSet(path, null);
            setPayload(null);
            return;
          }
          if (!res.ok) {
            setPayload(null);
            return;
          }
          const data = (await res.json()) as LinkPreviewPayload;
          cacheSet(path, data);
          setPayload(data);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setPayload(null);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [path]);

  useLayoutEffect(() => {
    if (payload === undefined) return;

    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const card = cardRef.current?.getBoundingClientRect();
      if (!anchor) return;
      setPos(
        placeCard(anchor, {
          width: card?.width || CARD_WIDTH,
          height: card?.height || 220,
        }),
      );
    };

    update();
    const ro = cardRef.current ? new ResizeObserver(update) : null;
    if (cardRef.current) ro?.observe(cardRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, payload, coverFailed]);

  if (payload === undefined || typeof document === 'undefined') return null;

  const body =
    payload === null ? (
      <div
        ref={cardRef}
        role="tooltip"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="w-72 rounded-xl border border-fd-border/60 bg-fd-card p-3 text-xs text-fd-muted-foreground shadow-xl"
      >
        无法预览此文档
      </div>
    ) : (
      <div
        ref={cardRef}
        role="tooltip"
        aria-labelledby={titleId}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="w-72 overflow-hidden rounded-xl border border-fd-border/60 bg-fd-card text-fd-card-foreground shadow-xl"
      >
        {payload.coverUrl && !coverFailed ? (
          <div className="px-3 pt-3">
            <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-fd-muted/80 p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payload.coverUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={() => setCoverFailed(true)}
              />
            </div>
          </div>
        ) : null}
        <div className="space-y-1.5 p-3">
          <p id={titleId} className="line-clamp-2 text-sm font-medium leading-snug">
            {payload.title}
          </p>
          {payload.description ? (
            <p className="line-clamp-2 text-xs text-fd-muted-foreground">{payload.description}</p>
          ) : null}
          <button
            type="button"
            className={cn('text-xs text-fd-primary hover:underline')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBrowse();
            }}
          >
            浏览文档
          </button>
        </div>
      </div>
    );

  return createPortal(
    <div
        className="pointer-events-auto fixed z-70"
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: CARD_WIDTH,
      }}
    >
      {body}
    </div>,
    document.body,
  );
}
