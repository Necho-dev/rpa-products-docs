'use client';

import type { ReactNode } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { ChevronRight } from 'lucide-react';
import { ReferenceAnchor } from '@/components/docs/references/reference-anchor';
import { ReferenceFileIcon } from '@/components/docs/references/reference-icon';
import { ReferenceKindBadge } from '@/components/docs/references/reference-kind-badge';
import { ReferencePromptQuiet } from '@/components/docs/references/reference-prompt';
import { ReferencePreviewToc } from '@/components/docs/references/reference-preview-toc';
import { ReferenceShell } from '@/components/docs/references/reference-shell';
import type {
  ReferenceBadge,
  ReferenceKind,
  ReferencePreviewSize,
  ReferencePrompt,
} from '@/lib/docs/doc-references-core';
import {
  DEFAULT_PREVIEW_SIZE,
  PREVIEW_SIZE_MAX_HEIGHT_CLASS,
} from '@/lib/docs/doc-references-core';
import { cn } from '@/lib/core/cn';

export function ReferencePreviewFrame({
  href,
  title,
  kind,
  badge,
  prompt,
  size = DEFAULT_PREVIEW_SIZE,
  updatedLabel,
  toc,
  headingPrefix,
  children,
}: {
  href: string;
  title: string;
  kind: ReferenceKind;
  badge?: ReferenceBadge;
  prompt?: ReferencePrompt;
  size?: ReferencePreviewSize;
  updatedLabel?: string;
  toc: TOCItemType[];
  headingPrefix: string;
  children: ReactNode;
}) {
  return (
    <ReferenceShell
      href={href}
      className="overflow-hidden rounded-xl border border-fd-border/70 bg-fd-background"
    >
      <div className="not-prose flex items-center gap-2 border-b border-fd-border/60 px-3 py-2">
        <ReferenceAnchor
          href={href}
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold leading-5 text-fd-foreground"
        >
          <ReferenceFileIcon />
          <span className="truncate">{title}</span>
          <ReferenceKindBadge kind={kind} badge={badge} />
          <ChevronRight
            className="size-3.5 shrink-0 text-fd-muted-foreground transition-transform group-hover/reference:translate-x-0.5"
            aria-hidden
          />
        </ReferenceAnchor>
        {updatedLabel ? (
          <span className="hidden shrink-0 text-xs tabular-nums text-fd-muted-foreground sm:inline">
            更新于 {updatedLabel}
          </span>
        ) : null}
      </div>
      <div data-reference-preview="" className="relative min-h-0">
        <div
          data-reference-preview-scroll=""
          className={cn(
            PREVIEW_SIZE_MAX_HEIGHT_CLASS[size],
            'overflow-y-auto overscroll-contain px-4 py-6 pe-12 md:px-5 md:pe-14 xl:px-6',
            prompt ? 'pb-14' : null,
          )}
        >
          {children}
        </div>
        <ReferencePreviewToc items={toc} prefix={headingPrefix} />
        {prompt ? (
          <div
            data-reference-preview-prompt=""
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
          >
            <div
              className="h-9 bg-linear-to-t from-fd-background to-transparent"
              aria-hidden
            />
            <div className="bg-fd-background px-4 pb-2 pe-12 md:px-5 md:pe-14 xl:px-6">
              <ReferencePromptQuiet prompt={prompt} className="text-xs leading-5" />
            </div>
          </div>
        ) : null}
      </div>
    </ReferenceShell>
  );
}
