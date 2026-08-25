'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { TOCItemType } from 'fumadocs-core/toc';
import { Text } from 'lucide-react';
import { I18nLabel } from 'fumadocs-ui/contexts/i18n';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import { TOCEmpty, TOCItem, TOCItems } from 'fumadocs-ui/components/toc/default';
import { cn } from '@/lib/core/cn';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { isCompactPaneWidth, measureVisiblePaneWidth } from '@/lib/docs/toc-compact';
import { peekTocHref } from '@/lib/docs/peek-heading-id';

export function PeekToc({ items }: { items: TOCItemType[] }) {
  const peek = useDocPeek();
  const pathname = usePathname();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const panel = root?.closest<HTMLElement>('[data-doc-peek-panel]');
    if (!panel) return;
    const layout = document.getElementById('nd-notebook-layout');
    const update = () =>
      setCompact((prev) => isCompactPaneWidth(measureVisiblePaneWidth('right'), prev));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(panel);
    if (layout) ro.observe(layout);

    if (!peek?.splitDragging) return () => ro.disconnect();
    let raf = 0;
    const loop = () => {
      update();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [root, pathname, peek?.splitDragging, peek?.peekRatio, peek?.target?.path]);

  const scoped = items.map((item) => ({
    ...item,
    url: peekTocHref(item.url),
  }));

  return (
    <TOCProvider toc={scoped} single>
      <div
        data-doc-peek-toc-col=""
        className={cn(
          'pointer-events-none sticky top-0 z-10 hidden h-[calc(var(--fd-docs-height)-var(--fd-docs-row-2))] shrink-0 self-start xl:block',
          compact ? 'w-14' : 'w-(--fd-toc-width) [--fd-toc-width:12.5rem]',
        )}
      >
        <div
          ref={setRoot}
          data-doc-peek-toc=""
          data-toc-compact={compact || undefined}
          className={cn(
            'not-prose flex h-full flex-col overflow-hidden pt-12 pe-3 pb-2',
            compact ? 'pointer-events-none absolute inset-e-0 top-0 bottom-32 w-14' : 'pointer-events-auto w-full',
            '[--fd-toc-width:12.5rem]',
          )}
        >
          <h3
            id="peek-toc-title"
            className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
          >
            <Text className="size-4" />
            <I18nLabel label="toc" />
          </h3>
          <TOCScrollArea>
            <TOCItems>
              {scoped.length === 0 ? <TOCEmpty /> : null}
              {scoped.map((item) => (
                <TOCItem key={item.url} item={item} />
              ))}
            </TOCItems>
          </TOCScrollArea>
        </div>
      </div>
    </TOCProvider>
  );
}
