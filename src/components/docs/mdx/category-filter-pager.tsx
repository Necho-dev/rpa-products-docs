'use client';

import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { buildPageTokens } from '@/lib/docs/source/category-filter-pagination';
import type { CategoryFilterPaginationStyle } from '@/lib/docs/source/category-filter-types';

/** 分页开启时按页切片；关闭时滚动触底再加载下一批 */
export function useCategoryFilterWindow({
  total,
  enable,
  size,
  resetKey,
}: {
  total: number;
  enable: boolean;
  size: number;
  resetKey?: string;
}) {
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(size);
  const stamp = `${total}|${size}|${enable}|${resetKey ?? ''}`;
  const [seen, setSeen] = useState(stamp);
  if (seen !== stamp) {
    setSeen(stamp);
    setPage(1);
    setLoaded(size);
  }

  const start = enable ? (page - 1) * size : 0;
  const end = enable ? Math.min(total, page * size) : Math.min(total, loaded);
  const hasMore = !enable && end < total;

  const loadMore = () => {
    setLoaded((n) => Math.min(total, n + size));
  };

  return {
    page,
    setPage,
    start,
    end,
    hasMore,
    loadMore,
  };
}

export function CategoryFilterPager({
  page,
  totalPages,
  style,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  style: CategoryFilterPaginationStyle;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const tokens = buildPageTokens(page, totalPages);
  const isButton = style === 'button';
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav
      aria-label="分页"
      className="flex flex-wrap items-center justify-end gap-1"
    >
      <PagerControl
        style={style}
        disabled={atStart}
        ariaLabel="上一页"
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </PagerControl>
      {tokens.map((token, i) =>
        token === 'ellipsis' ? (
          <span
            key={`e-${i}`}
            className={cn(
              'inline-flex select-none items-center justify-center text-sm text-fd-muted-foreground',
              isButton ? 'size-8 rounded-md bg-fd-muted/40' : 'min-w-8 px-1',
            )}
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            aria-label={`第 ${token} 页`}
            aria-current={token === page ? 'page' : undefined}
            onClick={() => onPageChange(token)}
            className={pageClass(style, token === page)}
          >
            {token}
          </button>
        ),
      )}
      <PagerControl
        style={style}
        disabled={atEnd}
        ariaLabel="下一页"
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </PagerControl>
    </nav>
  );
}

function PagerControl({
  style,
  disabled,
  ariaLabel,
  onClick,
  children,
}: {
  style: CategoryFilterPaginationStyle;
  disabled: boolean;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        pageClass(style, false),
        disabled && 'pointer-events-none opacity-35',
      )}
    >
      {children}
    </button>
  );
}

function pageClass(style: CategoryFilterPaginationStyle, active: boolean): string {
  const base =
    'inline-flex size-8 shrink-0 items-center justify-center text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';
  if (style === 'button') {
    return cn(
      base,
      'rounded-md',
      active
        ? 'bg-fd-primary font-semibold text-fd-primary-foreground'
        : 'bg-fd-muted/50 text-fd-foreground hover:bg-fd-accent',
    );
  }
  return cn(
    base,
    'rounded-sm',
    active
      ? 'font-semibold text-fd-primary'
      : 'text-fd-foreground hover:text-fd-primary',
  );
}
