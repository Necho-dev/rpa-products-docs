'use client';

import { Card } from 'fumadocs-ui/components/card';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { cn } from '@/lib/cn';
import type { ComponentProps } from 'react';

type CardProps = ComponentProps<typeof Card>;

export type SearchOpenCardProps = Pick<CardProps, 'icon' | 'title' | 'description' | 'className'>;

/**
 * 与文档站「全文搜索」弹窗联动：点击卡片即打开搜索（同 ⌘K / Ctrl+K）。
 */
export function SearchOpenCard({ icon, title, description, className }: SearchOpenCardProps) {
  const { setOpenSearch, enabled } = useSearchContext();

  return (
    <Card
      icon={icon}
      title={title}
      description={description}
      role="button"
      tabIndex={enabled ? 0 : undefined}
      aria-label={typeof title === 'string' ? `${title}（打开搜索）` : undefined}
      className={cn(
        enabled && 'cursor-pointer select-none hover:bg-fd-accent/80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background',
        className,
      )}
      onClick={() => {
        if (enabled) setOpenSearch(true);
      }}
      onKeyDown={(e) => {
        if (!enabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpenSearch(true);
        }
      }}
    />
  );
}
