import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/core/cn';

function Pulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-fd-muted', className)} />;
}

function SkeletonLines({ count }: { count: number }) {
  const widths = ['w-full', 'w-[94%]', 'w-[86%]', 'w-[71%]', 'w-[90%]', 'w-[62%]'];
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <Pulse key={i} className={cn('h-3.5 bg-fd-muted/70', widths[i % widths.length])} />
      ))}
    </div>
  );
}

function SkeletonTable({ rows, cols = 3 }: { rows: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-fd-border/50">
      <div
        className="grid gap-px bg-fd-border/35"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }, (_, i) => (
          <div key={`h-${i}`} className="bg-fd-muted/45 px-3 py-2.5">
            <Pulse className={cn('h-3 bg-fd-muted', i === 0 ? 'w-14' : 'w-20')} />
          </div>
        ))}
        {Array.from({ length: rows * cols }, (_, i) => (
          <div key={i} className="bg-fd-background px-3 py-2.5">
            <Pulse
              className={cn(
                'h-3 bg-fd-muted/65',
                i % cols === 0 ? 'w-16' : i % 3 === 1 ? 'w-[88%]' : 'w-[70%]',
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PeekArticleSkeleton() {
  return (
    <div className="flex min-h-full w-full">
      <div className="flex min-h-full min-w-0 flex-1 flex-col gap-5 px-4 py-6 md:px-5 md:pt-8 xl:px-6 xl:pt-10">
        <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-fd-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin text-fd-primary" aria-hidden />
          <span>正在加载文档…</span>
        </div>
        <div aria-hidden className="flex min-h-0 flex-1 flex-col gap-5">
        <Pulse className="h-3 w-36 bg-fd-muted/80" />
        <div className="space-y-2.5">
          <Pulse className="h-8 w-[82%] max-w-md rounded-md" />
          <Pulse className="h-4 w-full max-w-lg bg-fd-muted/80" />
          <Pulse className="h-4 w-2/3 max-w-sm bg-fd-muted/70" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Pulse className="h-7 w-20 rounded-full bg-fd-muted/75" />
          <Pulse className="h-7 w-24 rounded-full bg-fd-muted/65" />
          <Pulse className="h-7 w-16 rounded-full bg-fd-muted/55" />
        </div>

        <Pulse className="mt-1 h-4 w-20" />
        <SkeletonTable rows={4} cols={3} />

        <div className="h-36 w-full shrink-0 animate-pulse rounded-lg bg-fd-muted/55" />

        <Pulse className="h-4 w-24" />
        <SkeletonLines count={4} />
        <SkeletonTable rows={5} cols={4} />

        <Pulse className="h-4 w-20" />
        <div className="space-y-2 rounded-lg border border-fd-border/50 bg-fd-muted/25 p-4">
          <Pulse className="h-3 w-[88%] bg-fd-muted/70" />
          <Pulse className="h-3 w-[72%] bg-fd-muted/60" />
          <Pulse className="h-3 w-[80%] bg-fd-muted/60" />
          <Pulse className="h-3 w-[54%] bg-fd-muted/50" />
          <Pulse className="h-3 w-[76%] bg-fd-muted/60" />
          <Pulse className="h-3 w-[41%] bg-fd-muted/50" />
        </div>

        <Pulse className="h-4 w-22" />
        <SkeletonTable rows={4} cols={3} />
        </div>
      </div>
      <div className="hidden w-(--fd-toc-width) shrink-0 pt-4 xl:block">
        <div className="space-y-2.5 pe-3">
          <Pulse className="mb-3 h-3 w-10" />
          {['w-24', 'w-20', 'w-[6.5rem]', 'w-16', 'w-[7rem]', 'w-[5.5rem]', 'w-24', 'w-14'].map((w, i) => (
            <Pulse key={i} className={cn('h-3 bg-fd-muted/70', w, i % 3 === 1 && 'ms-3 w-16')} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PeekLoadingHint({ overlay }: { overlay?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-sm text-fd-muted-foreground',
        overlay && 'absolute inset-0 z-10 flex bg-fd-background/70 backdrop-blur-[2px]',
      )}
    >
      <Loader2Icon className="size-6 animate-spin text-fd-primary" aria-hidden />
      <p>正在加载文档…</p>
    </div>
  );
}
