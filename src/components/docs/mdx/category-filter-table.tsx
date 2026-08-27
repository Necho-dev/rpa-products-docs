'use client';

import { type MouseEvent } from 'react';
import Link from 'fumadocs-core/link';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Check, Copy, ImageOff, Loader2 } from 'lucide-react';
import { useOpenDocsHref } from '@/components/docs/docs-link';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { DurationDisplay } from '@/components/docs/duration-display';
import { highlightQueryText } from '@/components/docs/mdx/module-card';
import { useModuleCoverImage } from '@/components/docs/mdx/use-module-cover-image';
import { cn } from '@/lib/core/cn';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import {
  DEFAULT_SCHEDULE_DESCRIPTIONS,
  formatDataReadyCompactValue,
  formatScheduleChipTooltip,
  hasDataReady,
  hasDurationMeta,
  resolveDurationSec,
} from '@/lib/docs/format-schedule-meta';
import { folderPathBreadcrumb } from '@/lib/docs/source/category-config';
import type { CategoryFilterItem } from '@/lib/docs/source/category-filter-types';

const thClass =
  'px-3 py-1.5 text-left text-xs font-medium whitespace-nowrap text-fd-muted-foreground';
const tdClass = 'px-3 py-2 align-middle';

export function CategoryFilterTable({
  items,
  highlightQuery,
}: {
  items: CategoryFilterItem[];
  highlightQuery?: string;
}) {
  const showCover = items.some((item) => item.coverUrl);
  const showDescription = items.some((item) => item.description);
  const showReady = items.some((item) => hasDataReady(item.dataReady));
  const showDuration = items.some((item) => hasDurationMeta(item.estimatedDuration));
  const showInterval = items.some((item) => hasDurationMeta(item.minInterval));

  return (
    <div
      className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card"
      tabIndex={0}
      role="region"
      aria-label="筛选结果"
    >
        <table className="w-full min-w-xl border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-fd-border bg-fd-muted/45">
              <th className={cn(thClass, 'min-w-64')}>文档</th>
              {showDescription ? <th className={cn(thClass, 'min-w-40')}>描述</th> : null}
              {showReady ? (
                <th className={cn(thClass, 'text-right')}>最早就绪</th>
              ) : null}
              {showDuration ? (
                <th className={cn(thClass, 'text-right')}>预估耗时</th>
              ) : null}
              {showInterval ? (
                <th className={cn(thClass, 'text-right')}>最小间隔</th>
              ) : null}
              <th className={cn(thClass, 'w-11 text-center')}>
                <span className="sr-only">分屏打开</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.href}
                className="border-b border-fd-border/70 last:border-b-0 hover:bg-fd-muted/30"
              >
                <td className={tdClass}>
                  <DocCell
                    item={item}
                    showCoverSlot={showCover}
                    highlightQuery={highlightQuery}
                  />
                </td>
                {showDescription ? (
                  <td
                    className={cn(tdClass, 'max-w-72')}
                    title={item.description}
                  >
                    {item.description ? (
                      <span className="line-clamp-2 text-xs leading-relaxed text-fd-muted-foreground">
                        {highlightQueryText(item.description, highlightQuery)}
                      </span>
                    ) : (
                      <EmptyValue />
                    )}
                  </td>
                ) : null}
                {showReady ? (
                  <td className={cn(tdClass, 'whitespace-nowrap text-right')}>
                    <DataReadyCell item={item} />
                  </td>
                ) : null}
                {showDuration ? (
                  <td className={cn(tdClass, 'whitespace-nowrap text-right')}>
                    <DurationCell
                      meta={item.estimatedDuration}
                      fallbackDescription={DEFAULT_SCHEDULE_DESCRIPTIONS.estimatedDuration}
                      label="预估耗时"
                    />
                  </td>
                ) : null}
                {showInterval ? (
                  <td className={cn(tdClass, 'whitespace-nowrap text-right')}>
                    <DurationCell
                      meta={item.minInterval}
                      fallbackDescription={DEFAULT_SCHEDULE_DESCRIPTIONS.minInterval}
                      label="最小间隔"
                    />
                  </td>
                ) : null}
                <td className={cn(tdClass, 'w-11 text-center')}>
                  <SplitOpenButton href={item.href} title={item.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}

function EmptyValue() {
  return (
    <span className="text-fd-muted-foreground/45" aria-hidden>
      —
    </span>
  );
}

function DocCell({
  item,
  showCoverSlot,
  highlightQuery,
}: {
  item: CategoryFilterItem;
  showCoverSlot: boolean;
  highlightQuery?: string;
}) {
  const crumbs = folderPathBreadcrumb(item.folderPath, item.title);
  const openDocs = useOpenDocsHref({ onlyWhenSplit: true });

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {showCoverSlot ? (
        item.coverUrl ? (
          <TableCoverThumb coverUrl={item.coverUrl} />
        ) : (
          <div
            className="aspect-video w-22 shrink-0 rounded-md border border-dashed border-fd-border/70 bg-fd-muted/20"
            aria-hidden
          />
        )
      ) : null}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={item.href}
            className="truncate text-sm font-medium leading-snug text-fd-primary no-underline hover:underline"
            onClick={(e: MouseEvent<HTMLAnchorElement>) => openDocs(item.href, e)}
          >
            {highlightQueryText(item.title, highlightQuery)}
          </Link>
          {item.badge ? (
            <span
              className="shrink-0 rounded px-1.5 py-px text-[10px] font-semibold leading-4 text-white"
              style={{ backgroundColor: item.badge.color ?? '#6366f1' }}
            >
              {item.badge.label}
            </span>
          ) : null}
        </div>
        {item.entry ? (
          <div className="mt-1 flex min-w-0 items-center gap-0.5">
            <code className="min-w-0 truncate font-mono text-[11px] leading-snug text-fd-muted-foreground/80">
              {highlightQueryText(item.entry, highlightQuery)}
            </code>
            <EntryCopyButton value={item.entry} />
          </div>
        ) : null}
        {crumbs ? (
          <p className="mt-1 truncate text-[11px] text-fd-muted-foreground/80">
            {highlightQueryText(crumbs, highlightQuery)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SplitOpenButton({ href, title }: { href: string; title: string }) {
  const peek = useDocPeek();
  const splitOpen = Boolean(peek?.open);
  const label = splitOpen ? '右栏打开' : '分屏打开';

  return (
    <button
      type="button"
      title={label}
      aria-label={`${label}「${title}」`}
      onClick={() => peek?.openPeek(href, 'main')}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md',
        'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
      )}
    >
      <SplitPaneIcon />
    </button>
  );
}

function SplitPaneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <rect x="8" y="2.75" width="5.25" height="10.5" rx="0.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function EntryCopyButton({ value }: { value: string }) {
  const [copied, onCopy] = useCopyButton(() => void safeWriteClipboard(value));

  return (
    <button
      type="button"
      aria-label={copied ? '已复制' : '复制 Entry'}
      title={copied ? '已复制' : '复制 Entry'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCopy(e);
      }}
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded',
        'text-fd-muted-foreground/80 hover:bg-fd-accent hover:text-fd-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

function TableCoverThumb({ coverUrl }: { coverUrl: string }) {
  const { containerRef, src, status, onLoad, onError } = useModuleCoverImage(coverUrl);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-22 shrink-0 overflow-hidden rounded-md border border-fd-border/70 bg-fd-muted/20"
    >
      {status !== 'loaded' ? (
        <CoverPlaceholder
          phase={status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'idle'}
        />
      ) : null}
      {src && status !== 'error' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          decoding="async"
          fetchPriority="low"
          onLoad={onLoad}
          onError={onError}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </div>
  );
}

function CoverPlaceholder({ phase }: { phase: 'idle' | 'loading' | 'error' }) {
  return (
    <span
      className={cn(
        'absolute inset-0 bg-fd-muted/30',
        phase === 'loading' && 'animate-pulse',
      )}
      aria-hidden
    >
      {phase === 'loading' ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-3.5 animate-spin text-fd-muted-foreground/60" />
        </span>
      ) : null}
      {phase === 'error' ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="size-3.5 text-fd-muted-foreground/55" />
        </span>
      ) : null}
    </span>
  );
}

function DataReadyCell({ item }: { item: CategoryFilterItem }) {
  if (!hasDataReady(item.dataReady)) return <EmptyValue />;
  const value = formatDataReadyCompactValue(item.dataReady!);
  const tooltip = formatScheduleChipTooltip(
    '最早就绪',
    item.dataReady?.description,
    DEFAULT_SCHEDULE_DESCRIPTIONS.dataReady,
  );
  return (
    <span
      className="text-xs font-medium tabular-nums tracking-tight text-fd-muted-foreground"
      title={tooltip}
    >
      {value || <EmptyValue />}
    </span>
  );
}

function DurationCell({
  meta,
  fallbackDescription,
  label,
}: {
  meta: CategoryFilterItem['estimatedDuration'];
  fallbackDescription: string;
  label: string;
}) {
  const sec = resolveDurationSec(meta);
  if (sec == null) return <EmptyValue />;
  const tooltip = formatScheduleChipTooltip(
    label,
    meta?.description,
    fallbackDescription,
  );
  return (
    <span className="inline-flex justify-end" title={tooltip}>
      <DurationDisplay
        sec={sec}
        unit={meta?.unit}
        className="text-xs font-medium tabular-nums tracking-tight text-fd-muted-foreground"
      />
    </span>
  );
}
