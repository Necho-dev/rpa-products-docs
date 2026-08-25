import type { ReferenceBadge, ReferenceKind } from '@/lib/docs/doc-references-core';
import { REFERENCE_KIND_LABEL } from '@/lib/docs/doc-references-core';
import { cn } from '@/lib/core/cn';

export function ReferenceKindBadge({
  kind,
  badge,
  size = 'md',
}: {
  kind: ReferenceKind;
  badge?: ReferenceBadge;
  size?: 'sm' | 'md';
}) {
  const label = badge?.label?.trim() || REFERENCE_KIND_LABEL[kind];
  const color = badge?.color;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md font-medium',
        size === 'sm'
          ? 'h-4 px-1 text-[10px] leading-none'
          : 'h-5 px-1.5 text-[11px] leading-none',
        color
          ? 'text-fd-card'
          : kind === 'dependency'
            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
            : 'bg-fd-muted text-fd-muted-foreground',
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {label}
    </span>
  );
}
