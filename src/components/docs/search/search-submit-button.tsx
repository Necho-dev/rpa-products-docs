'use client';

import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/core/cn';

export type SearchSubmitButtonProps = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

export function SearchSubmitButton({
  onClick,
  loading,
  disabled,
  className,
}: SearchSubmitButtonProps) {
  return (
    <button
      type="button"
      aria-label="搜索"
      title="搜索"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-fd-border',
        'text-fd-muted-foreground transition-colors',
        'hover:bg-fd-accent hover:text-fd-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Search className="size-4" />
      )}
    </button>
  );
}
