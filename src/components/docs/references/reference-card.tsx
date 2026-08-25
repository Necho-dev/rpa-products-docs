'use client';

import { ChevronRight } from 'lucide-react';
import { ReferenceAnchor } from '@/components/docs/references/reference-anchor';
import { ReferenceCover } from '@/components/docs/references/reference-cover';
import { ReferenceFileIcon } from '@/components/docs/references/reference-icon';
import { ReferenceKindBadge } from '@/components/docs/references/reference-kind-badge';
import { ReferenceShell } from '@/components/docs/references/reference-shell';
import { ReferencePromptQuiet } from '@/components/docs/references/reference-prompt';
import type { ResolvedReference } from '@/lib/docs/doc-references';
import { cn } from '@/lib/core/cn';

function UpdatedLabel({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  return (
    <span className={cn('shrink-0 text-[11px] tabular-nums text-fd-muted-foreground', className)}>
      更新于 {value}
    </span>
  );
}

function LinkRow({ reference }: { reference: ResolvedReference }) {
  return (
    <ReferenceShell href={reference.url} className="inline-flex w-fit max-w-full">
      <ReferenceAnchor
        href={reference.url}
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-md border border-fd-border/50 bg-fd-background',
          'px-2 py-1 text-xs text-fd-foreground hover:border-fd-border hover:bg-fd-muted/40',
        )}
      >
        <ReferenceFileIcon />
        <span className="min-w-0 truncate font-medium leading-4">{reference.title}</span>
        <ReferenceKindBadge kind={reference.kind} badge={reference.badge} size="sm" />
        <ReferencePromptQuiet prompt={reference.prompt} className="hidden max-w-48 sm:inline-flex" />
        <ChevronRight
          className="size-3 shrink-0 text-fd-muted-foreground transition-transform group-hover/reference:translate-x-0.5"
          aria-hidden
        />
      </ReferenceAnchor>
    </ReferenceShell>
  );
}

function SummaryRow({ reference }: { reference: ResolvedReference }) {
  return (
    <ReferenceShell href={reference.url}>
      <ReferenceAnchor
        href={reference.url}
        className="flex items-center gap-2 rounded-lg border border-fd-border/50 bg-fd-background px-2 py-1.5 hover:border-fd-border hover:bg-fd-muted/30"
      >
        <span className="flex min-h-11 min-w-0 flex-1 items-stretch gap-2">
          <ReferenceCover
            src={reference.coverUrl}
            className="w-18 self-stretch p-px"
            imgClassName="h-full w-full rounded-[3px] object-cover"
          />
          <span className="min-w-0 flex-1 py-px">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium leading-5 text-fd-foreground">
                {reference.title}
              </span>
              <ReferenceKindBadge kind={reference.kind} badge={reference.badge} />
            </span>
            {reference.description ? (
              <span className="mt-1 line-clamp-2 block text-[11px] leading-4.5 text-fd-muted-foreground">
                {reference.description}
              </span>
            ) : null}
            <ReferencePromptQuiet prompt={reference.prompt} className="mt-1 max-w-full sm:hidden" />
          </span>
        </span>
        <span className="hidden shrink-0 flex-col items-end justify-center gap-1 sm:flex">
          <ReferencePromptQuiet prompt={reference.prompt} className="max-w-52" />
          <span className="flex items-center gap-1">
            <UpdatedLabel value={reference.updatedLabel} />
            <ChevronRight
              className="size-3.5 text-fd-muted-foreground transition-transform group-hover/reference:translate-x-0.5"
              aria-hidden
            />
          </span>
        </span>
        <ChevronRight
          className="size-3.5 shrink-0 text-fd-muted-foreground sm:hidden"
          aria-hidden
        />
      </ReferenceAnchor>
    </ReferenceShell>
  );
}

export function ReferenceCard({ reference }: { reference: ResolvedReference }) {
  switch (reference.mode) {
    case 'link':
      return <LinkRow reference={reference} />;
    case 'preview':
      return <SummaryRow reference={reference} />;
    case 'summary':
      return <SummaryRow reference={reference} />;
  }
}
