'use client';

import type { TOCItemType } from 'fumadocs-core/toc';
import { Text } from 'lucide-react';
import { I18nLabel } from 'fumadocs-ui/contexts/i18n';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import { TOCEmpty, TOCItem, TOCItems } from 'fumadocs-ui/components/toc/default';
import { cn } from '@/lib/core/cn';

export function PeekToc({ items }: { items: TOCItemType[] }) {
  return (
    <TOCProvider toc={items}>
      <div
        data-doc-peek-toc=""
        className={cn(
          'not-prose sticky top-0 hidden h-full w-(--fd-toc-width) shrink-0 flex-col pt-12 pe-0 pb-2 xl:flex',
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
            {items.length === 0 ? <TOCEmpty /> : null}
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </TOCItems>
        </TOCScrollArea>
      </div>
    </TOCProvider>
  );
}
