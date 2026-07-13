'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import type { SearchScope, SearchTagFilter } from '@/lib/docs/search/search-utils';
import type { SearchTag } from '@/lib/docs/search/search-tags';

export type SearchScopeTabsProps = {
  /** 当前分区 tag（null = 全部） */
  tag: SearchTagFilter;
  onTagChange: (tag: SearchTagFilter) => void;
  /** 可用的分区列表 */
  tags: SearchTag[];
  /** 全文 / 仅文档 */
  scope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
};

const SCOPE_OPTIONS: { value: SearchScope; label: string }[] = [
  { value: 'full', label: '全文' },
  { value: 'page', label: '仅文档' },
];

const ALL_LABEL = '全部';

export function SearchScopeTabs({
  tag,
  onTagChange,
  tags,
  scope,
  onScopeChange,
}: SearchScopeTabsProps) {
  const [open, setOpen] = useState(false);
  const currentLabel = tag ? (tags.find((t) => t.value === tag)?.label ?? ALL_LABEL) : ALL_LABEL;
  const hasPartitions = tags.length > 0;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      {/* 左：分区 Popover 下拉（仅在有分区时展示） */}
      {hasPartitions && (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-expanded={open}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                tag !== null
                  ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
                  : 'border-fd-border text-fd-muted-foreground hover:bg-fd-accent',
              )}
            >
              {currentLabel}
              <ChevronDown
                className={cn('size-3 transition-transform', open && 'rotate-180')}
              />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={6}
              avoidCollisions={false}
              className={cn(
                'z-50 min-w-[120px] rounded-md border border-fd-border bg-fd-popover p-1 shadow-md',
                'animate-in fade-in-0 zoom-in-95',
              )}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {/* 全部 */}
              <button
                type="button"
                onClick={() => { onTagChange(null); setOpen(false); }}
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                  tag === null
                    ? 'text-fd-primary bg-fd-primary/10'
                    : 'text-fd-foreground hover:bg-fd-accent',
                )}
              >
                {ALL_LABEL}
                {tag === null && <Check className="size-3" />}
              </button>

              {/* 各分区 */}
              {tags.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { onTagChange(t.value); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                    tag === t.value
                      ? 'text-fd-primary bg-fd-primary/10'
                      : 'text-fd-foreground hover:bg-fd-accent',
                  )}
                >
                  {t.label}
                  {tag === t.value && <Check className="size-3" />}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {/* 右：全文 / 仅文档 */}
      <div className="flex shrink-0 items-center gap-1 ml-auto">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={scope === opt.value}
            onClick={() => onScopeChange(opt.value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              scope === opt.value
                ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
                : 'border-fd-border text-fd-muted-foreground hover:bg-fd-accent',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
