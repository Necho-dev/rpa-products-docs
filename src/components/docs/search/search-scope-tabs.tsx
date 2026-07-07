'use client';

import { cn } from '@/lib/core/cn';
import type { SearchScope } from '@/lib/docs/search/search-utils';

export type SearchScopeTabsProps = {
  scope: SearchScope;
  onChange: (scope: SearchScope) => void;
};

const OPTIONS: { value: SearchScope; label: string }[] = [
  { value: 'full', label: '全文' },
  { value: 'page', label: '仅文档' },
];

export function SearchScopeTabs({ scope, onChange }: SearchScopeTabsProps) {
  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={scope === opt.value}
          onClick={() => onChange(opt.value)}
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
  );
}
