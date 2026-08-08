'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { History, PackagePlus, RefreshCwIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { DEV_APP_RELEASE } from '@/lib/observability/app-release';
import { isChunkLoadFailure } from '@/lib/observability/chunk-load-failure';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const DISMISS_STORAGE_KEY = 'docs:update-banner-dismissed-release';
const CHUNK_RELOAD_STORAGE_KEY = 'docs:chunk-reload-once';

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

type VersionInfo = {
  release: string;
  gitSha?: string;
  builtAt?: string;
};

async function fetchVersion(): Promise<VersionInfo | undefined> {
  try {
    const res = await fetch('/api/version', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      release?: string;
      gitSha?: string;
      builtAt?: string;
    };
    const release = typeof data.release === 'string' ? data.release.trim() : '';
    if (release === '') return undefined;
    return {
      release,
      gitSha: typeof data.gitSha === 'string' ? data.gitSha.trim() || undefined : undefined,
      builtAt: typeof data.builtAt === 'string' ? data.builtAt.trim() || undefined : undefined,
    };
  } catch {
    return undefined;
  }
}

function isComparableRelease(release: string | undefined): release is string {
  return typeof release === 'string' && release !== '' && release !== DEV_APP_RELEASE;
}

function readDismissedRelease(): string | undefined {
  try {
    return sessionStorage.getItem(DISMISS_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeDismissedRelease(release: string): void {
  try {
    sessionStorage.setItem(DISMISS_STORAGE_KEY, release);
  } catch {
    // ignore quota / private mode
  }
}

function maybeReloadOnChunkFailure(reason: unknown): void {
  if (!isChunkLoadFailure(reason)) return;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) === '1') return;
    sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, '1');
  } catch {
    // 无法写 storage 时仍尝试一次硬刷新
  }
  window.location.reload();
}

function shortVersionLabel(version: VersionInfo): string {
  if (version.gitSha && version.gitSha !== version.release) {
    return version.gitSha.slice(0, 7);
  }
  const release = version.release;
  return release.length > 12 ? `${release.slice(0, 10)}…` : release;
}

function formatBuiltAt(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

const BANNER_ENTER_MS = 380;
const BANNER_EXIT_MS = 280;
const REFRESH_SPIN_MS = 420;

function AppUpdateBanner({
  version,
  onRefresh,
  onDismiss,
}: {
  version: VersionInfo;
  onRefresh: () => void;
  onDismiss: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const closedRef = useRef(false);
  const versionLabel = shortVersionLabel(version);
  const builtAtLabel = formatBuiltAt(version.builtAt);
  const metaTitle = [
    `版本 ${versionLabel}`,
    builtAtLabel ? `更新于 ${builtAtLabel}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const finishClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  const requestClose = useCallback(() => {
    if (exiting || refreshing) return;
    setExiting(true);
  }, [exiting, refreshing]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(finishClose, BANNER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exiting, finishClose]);

  const handleRefresh = useCallback(() => {
    if (refreshing || exiting) return;
    setRefreshing(true);
    window.setTimeout(() => {
      onRefresh();
    }, REFRESH_SPIN_MS);
  }, [exiting, onRefresh, refreshing]);

  return createPortal(
    <>
      <style>
        {`
        @keyframes app-update-banner-in {
          from {
            opacity: 0;
            transform: translate3d(1.25rem, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes app-update-banner-out {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          to {
            opacity: 0;
            transform: translate3d(1.25rem, 0, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes app-update-banner-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes app-update-banner-out {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        }
        `}
      </style>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed z-10000 flex justify-end',
          /* 相对贴边再偏左下一点，避开顶栏角落 */
          'top-[max(2.75rem,calc(env(safe-area-inset-top,0px)+2.25rem))]',
          'inset-e-[max(2.75rem,calc(env(safe-area-inset-end,0px)+1.75rem))]',
          'ps-4',
        )}
      >
        <div
          className={cn(
            'pointer-events-auto relative w-max max-w-[min(30rem,calc(100vw-3.5rem))]',
            'rounded-xl border border-fd-border/80 bg-fd-popover pe-3.5 ps-2.5 py-2.5',
            'text-sm text-fd-popover-foreground shadow-lg',
            'will-change-transform',
          )}
          style={{
            animation: exiting
              ? `app-update-banner-out ${BANNER_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
              : `app-update-banner-in ${BANNER_ENTER_MS}ms cubic-bezier(0.16, 1, 0.3, 1) both`,
          }}
        >
          <button
            type="button"
            onClick={requestClose}
            aria-label="关闭更新提示"
            className={cn(
              'absolute -top-2.5 -inset-e-2.5 z-10 flex size-6 cursor-pointer items-center justify-center',
              'rounded-full border border-fd-border/80 bg-fd-popover text-fd-muted-foreground shadow-md',
              'transition-[colors,transform] hover:bg-fd-accent hover:text-fd-accent-foreground',
              'active:scale-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
            )}
          >
            <XIcon className="size-3.5" strokeWidth={2.5} />
          </button>

          {/* 图标高度对齐两行文案（leading-5 + gap + leading-4 ≈ size-9.5） */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="刷新页面查看最新内容"
              className={cn(
                'flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-lg',
                'bg-fd-primary/12 text-fd-primary',
                'transition-[colors,transform] hover:bg-fd-primary/18',
                'active:scale-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
                'disabled:cursor-wait',
              )}
            >
              <RefreshCwIcon
                className={cn(
                  'size-4 transition-transform',
                  refreshing && 'animate-spin',
                )}
                aria-hidden
              />
            </button>
            <div className="min-w-0 overflow-hidden" title={metaTitle}>
              <p className="whitespace-nowrap font-medium leading-5">
                检测到内容更新，请刷新页面查看最新内容！
              </p>
              <div className="mt-1 flex h-4 min-w-0 items-center gap-2 text-xs text-fd-muted-foreground">
                <span className="inline-flex h-4 min-w-0 max-w-[45%] items-center gap-1.5">
                  <PackagePlus className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  <span className="truncate font-mono leading-none">{versionLabel}</span>
                </span>
                {builtAtLabel ? (
                  <>
                    <span className="flex h-4 shrink-0 items-center text-fd-border" aria-hidden>
                      ·
                    </span>
                    <span className="inline-flex h-4 min-w-0 flex-1 items-center gap-1.5">
                      {/* lucide@1.8 无 RotateCcwClock，History 为时钟+回绕语义最近似 */}
                      <History className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="truncate tabular-nums leading-none">{builtAtLabel}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/**
 * 长会话版本哨兵：轮询 / focus 探测 BUILD_ID 变化并提示硬刷新；
 * 同时兜底部署窗口期 ChunkLoadError（同会话仅自动 reload 一次）。
 */
export function AppUpdateSentinel() {
  const isClient = useIsClient();
  const baselineRef = useRef<string | undefined>(undefined);
  const [updateVersion, setUpdateVersion] = useState<VersionInfo | undefined>();
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    const remote = await fetchVersion();
    if (!remote || !isComparableRelease(remote.release)) return;

    const baseline = baselineRef.current;
    if (!isComparableRelease(baseline)) {
      baselineRef.current = remote.release;
      return;
    }

    if (baseline === remote.release) return;

    const dismissedRelease = readDismissedRelease();
    if (dismissedRelease === remote.release) {
      setDismissed(true);
      return;
    }

    setDismissed(false);
    setUpdateVersion(remote);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let cancelled = false;
    void (async () => {
      const initial = await fetchVersion();
      if (cancelled || !initial || !isComparableRelease(initial.release)) return;
      baselineRef.current = initial.release;
    })();

    return () => {
      cancelled = true;
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    const onFocus = () => {
      void checkForUpdate();
    };

    const timer = window.setInterval(() => {
      void checkForUpdate();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [isClient, checkForUpdate]);

  useEffect(() => {
    if (!isClient) return;

    const onError = (event: ErrorEvent) => {
      maybeReloadOnChunkFailure(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      maybeReloadOnChunkFailure(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [isClient]);

  const showBanner =
    isClient &&
    !dismissed &&
    updateVersion != null &&
    isComparableRelease(updateVersion.release);

  const onRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const onDismiss = useCallback(() => {
    if (updateVersion) writeDismissedRelease(updateVersion.release);
    setDismissed(true);
  }, [updateVersion]);

  if (!showBanner || !updateVersion) return null;

  return (
    <AppUpdateBanner
      version={updateVersion}
      onRefresh={onRefresh}
      onDismiss={onDismiss}
    />
  );
}
