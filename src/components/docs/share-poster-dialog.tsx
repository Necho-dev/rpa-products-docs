'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  Loader2Icon,
  Share2Icon,
  ShareIcon,
  XIcon,
} from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/lib/core/cn';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';

type CopyState = 'idle' | 'ok' | 'err';

function useCopyLink() {
  const [state, setState] = useState<CopyState>('idle');
  const copy = useCallback((url: string) => {
    void safeWriteClipboard(url).then(() => {
      setState('ok');
      setTimeout(() => setState('idle'), 2000);
    });
  }, []);
  return [state, copy] as const;
}

function ShareLinkRow({
  label,
  hint,
  url,
  copied,
  onCopy,
}: {
  label: string;
  hint?: string;
  url: string;
  copied: CopyState;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-medium text-fd-muted-foreground">
        {label}
        {hint ? <span className="font-normal text-fd-muted-foreground/70">{hint}</span> : null}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          title={url}
          aria-label={label}
          className="min-w-0 flex-1 rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-[11px] text-fd-foreground sm:text-xs"
        />
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            buttonVariants({ color: 'secondary', size: 'sm' }),
            'w-full shrink-0 gap-1.5 sm:w-auto',
          )}
        >
          {copied === 'ok' ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          复制
        </button>
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function useCanNativeShare() {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator.share === 'function',
    () => false,
  );
}

type PosterSize = { width: number; height: number };

function getPosterMaxHeightPx() {
  const vhCap = window.innerHeight * (window.innerWidth >= 1024 ? 0.5 : window.innerWidth >= 768 ? 0.44 : window.innerWidth >= 640 ? 0.38 : 0.32);
  const pxCap = window.innerWidth >= 1024 ? 460 : window.innerWidth >= 768 ? 380 : window.innerWidth >= 640 ? 320 : 260;
  return Math.min(vhCap, pxCap);
}

function fitPosterSize(naturalW: number, naturalH: number, maxW: number, maxH: number): PosterSize {
  const ratio = naturalW / naturalH;
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export function PosterPreview({ posterUrl, title }: { posterUrl: string; title: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stableWidth = useRef<number | null>(null);
  const [natural, setNatural] = useState<PosterSize | null>(null);
  const [layout, setLayout] = useState<PosterSize | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const ready = loaded && layout !== null;
  const pending = !error && !ready;

  const recomputeLayout = useCallback(() => {
    if (!natural || !frameRef.current) return;
    const measured = frameRef.current.clientWidth;
    if (measured <= 0) return;
    /*
     * 海报撑满可用宽度会改变弹窗内容高度，进而让滚动条出现/消失，可用宽度随之来回跳动，
     * ResizeObserver 就会陷入抖动。这里收敛到观察到的最小宽度（即有滚动条时的宽度），
     * 仅在视口真正变化时重新放开。
     */
    const maxW = Math.min(measured, stableWidth.current ?? measured);
    stableWidth.current = maxW;
    const next = fitPosterSize(natural.width, natural.height, maxW, getPosterMaxHeightPx());
    setLayout((prev) =>
      prev && prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, [natural]);

  const handleViewportResize = useCallback(() => {
    stableWidth.current = null;
    recomputeLayout();
  }, [recomputeLayout]);

  useEffect(() => {
    if (!natural) return;
    stableWidth.current = null;
    recomputeLayout();
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => recomputeLayout());
    observer.observe(frame);
    window.addEventListener('resize', handleViewportResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleViewportResize);
    };
  }, [natural, recomputeLayout, handleViewportResize]);

  return (
    <div ref={frameRef} className="w-full">
      <div
        className={cn(
          'relative mx-auto overflow-hidden rounded-md border border-fd-border bg-fd-muted/30',
          pending && 'min-h-30 w-full',
        )}
        style={
          layout
            ? { width: layout.width, height: layout.height }
            : undefined
        }
        aria-busy={pending}
      >
        {pending ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2Icon className="size-6 animate-spin text-fd-primary/70" />
            <span className="text-xs text-fd-muted-foreground">正在生成分享图…</span>
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-fd-muted-foreground">
            分享图加载失败，请稍后重试或点击下载
          </div>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt={`${title} 分享图`}
          width={natural?.width}
          height={natural?.height}
          onLoad={(event) => {
            const img = event.currentTarget;
            const nat = { width: img.naturalWidth, height: img.naturalHeight };
            setNatural(nat);
            setLoaded(true);
            const maxW = frameRef.current?.clientWidth ?? 0;
            if (maxW > 0) {
              stableWidth.current = maxW;
              setLayout(fitPosterSize(nat.width, nat.height, maxW, getPosterMaxHeightPx()));
            }
          }}
          onError={() => setError(true)}
          className={cn(
            'block size-full transition-opacity duration-500 ease-out',
            ready ? 'animate-fd-fade-in opacity-100' : 'opacity-0',
          )}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        buttonVariants({
          color: primary ? 'primary' : 'secondary',
          size: 'sm',
        }),
        'w-full justify-center gap-1.5 sm:w-auto',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export type SharePosterDialogProps = {
  open: boolean;
  onClose: () => void;
  dialogLabel: string;
  title: string;
  description?: string;
  pageUrl: string;
  /** 双栏对比链接单独一行，不与单页链接混用 */
  compareUrl?: string | null;
  posterUrl: string;
  downloadFileName?: string;
};

export function SharePosterDialog({
  open,
  onClose,
  dialogLabel,
  title,
  description,
  pageUrl,
  compareUrl,
  posterUrl,
  downloadFileName = 'doc-share-poster.png',
}: SharePosterDialogProps) {
  const [linkCopied, copyLink] = useCopyLink();
  const [compareCopied, copyCompare] = useCopyLink();
  const [imageCopied, setImageCopied] = useState<CopyState>('idle');
  const isClient = useIsClient();
  const canNativeShare = useCanNativeShare();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const fetchPosterBlob = useCallback(async () => {
    const res = await fetch(posterUrl, { credentials: 'include' });
    if (!res.ok) throw new Error('fetch failed');
    return res.blob();
  }, [posterUrl]);

  const handleCopyLink = () => copyLink(pageUrl);

  const handleDownload = () => {
    void (async () => {
      try {
        const blob = await fetchPosterBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        window.open(posterUrl, '_blank');
      }
    })();
  };

  const handleCopyImage = () => {
    void (async () => {
      try {
        const blob = await fetchPosterBlob();
        if (!navigator.clipboard?.write) throw new Error('no clipboard write');
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setImageCopied('ok');
        setTimeout(() => setImageCopied('idle'), 2000);
      } catch {
        setImageCopied('err');
        setTimeout(() => setImageCopied('idle'), 3000);
      }
    })();
  };

  const handleNativeShare = () => {
    void (async () => {
      try {
        const blob = await fetchPosterBlob();
        const file = new File([blob], downloadFileName, { type: 'image/png' });
        const payload: ShareData = {
          title,
          text: description ?? title,
          url: pageUrl,
        };
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ ...payload, files: [file] });
        } else {
          await navigator.share(payload);
        }
      } catch {
        /* user cancelled or unsupported */
      }
    })();
  };

  const dialog = open && isClient ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      className="fixed inset-0 z-9999 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-h-[min(92dvh,900px)] flex-col overflow-hidden rounded-t-2xl border border-fd-border/60 bg-fd-card shadow-2xl sm:max-w-88 sm:max-h-[min(88dvh,820px)] sm:rounded-2xl md:max-w-sm lg:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-fd-border/50 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Share2Icon className="size-4 shrink-0 text-fd-muted-foreground" />
            <span className="text-sm font-medium">{dialogLabel}</span>
          </div>
          <button
            type="button"
            title="关闭"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-4 sm:py-4 sm:pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="line-clamp-3 text-sm font-semibold text-fd-foreground sm:line-clamp-none sm:text-base">
              {title}
            </h2>
            {description ? (
              <p className="line-clamp-2 text-xs text-fd-muted-foreground sm:text-sm">{description}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-fd-muted-foreground">分享图预览</span>
            <PosterPreview key={posterUrl} posterUrl={posterUrl} title={title} />
          </div>

          <ShareLinkRow
            label="当前文档链接"
            url={pageUrl}
            copied={linkCopied}
            onCopy={handleCopyLink}
          />

          {compareUrl ? (
            <ShareLinkRow
              label="双栏对比链接"
              url={compareUrl}
              copied={compareCopied}
              onCopy={() => copyCompare(compareUrl)}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ActionButton
              icon={linkCopied === 'ok' ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              label="复制链接"
              onClick={handleCopyLink}
            />
            <ActionButton
              icon={<DownloadIcon className="size-3.5" />}
              label="下载图片"
              onClick={handleDownload}
            />
            <ActionButton
              icon={
                imageCopied === 'ok' ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )
              }
              label={imageCopied === 'err' ? '复制失败' : '复制图片'}
              onClick={handleCopyImage}
            />
            {canNativeShare ? (
              <ActionButton
                icon={<ShareIcon className="size-3.5" />}
                label="系统分享"
                onClick={handleNativeShare}
                primary
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isClient && dialog ? createPortal(dialog, document.body) : null;
}
