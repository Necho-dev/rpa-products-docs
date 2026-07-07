'use client';

import { BrushCleaning } from 'lucide-react';
import { useSearch } from 'fumadocs-ui/components/dialog/search';
import { cn } from '@/lib/core/cn';

export type DocsSearchDialogInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'placeholder' | 'type'
> & {
  placeholder: string;
};

/** 自定义搜索输入框：Fumadocs 内置 `SearchDialogInput` 会强制覆盖 placeholder */
export function DocsSearchDialogInput({
  placeholder,
  className,
  ...props
}: DocsSearchDialogInputProps) {
  const { search, onSearchChange } = useSearch();
  const hasValue = search.length > 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5">
      <input
        {...props}
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'min-w-0 flex-1 bg-transparent text-lg placeholder:text-fd-muted-foreground focus-visible:outline-none',
          className,
        )}
      />
      {hasValue && (
        <button
          type="button"
          aria-label="清除"
          title="清除"
          onClick={() => onSearchChange('')}
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-md',
            'text-fd-muted-foreground/60 transition-colors',
            'hover:bg-fd-accent/80 hover:text-fd-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring/40',
          )}
        >
          <BrushCleaning className="size-4 stroke-2" />
        </button>
      )}
    </div>
  );
}
