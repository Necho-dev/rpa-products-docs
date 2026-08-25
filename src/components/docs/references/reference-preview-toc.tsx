'use client';

import type { TOCItemType } from 'fumadocs-core/toc';
import { Text } from 'lucide-react';
import { I18nLabel } from 'fumadocs-ui/contexts/i18n';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import { TOCEmpty, TOCItem, TOCItems } from 'fumadocs-ui/components/toc/default';
import { scopedTocHref } from '@/lib/docs/peek-heading-id';

export function ReferencePreviewToc({
  items,
  prefix,
}: {
  items: TOCItemType[];
  prefix: string;
}) {
  if (items.length === 0) return null;

  const scoped = items.map((item) => ({
    ...item,
    url: scopedTocHref(item.url, prefix),
  }));

  return (
    <TOCProvider toc={scoped} single>
      <nav
        aria-label="目录"
        className="pointer-events-none absolute inset-s-auto end-3 top-0 z-20 hidden h-full w-10 overflow-visible sm:block"
      >
        <div
          data-reference-preview-toc=""
          className="pointer-events-auto absolute inset-e-0 top-2 bottom-2 flex min-h-0 flex-col overflow-hidden not-prose"
        >
          <h3
            id="reference-preview-toc-title"
            className="inline-flex items-center gap-1.5 pt-1 text-sm text-fd-muted-foreground"
          >
            <Text className="size-4" />
            <I18nLabel label="toc" />
          </h3>
          <TOCScrollArea className="flex-1 [scrollbar-width:none]">
            <TOCItems>
              {scoped.length === 0 ? <TOCEmpty /> : null}
              {scoped.map((item) => (
                <TOCItem key={item.url} item={item} />
              ))}
            </TOCItems>
          </TOCScrollArea>
        </div>
      </nav>
    </TOCProvider>
  );
}
