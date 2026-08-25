'use client';

import { use, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AISearchContext } from '@/components/ai/ai-search-context';
import { DocsLinkHoverCard } from '@/components/docs/docs-link-hover-card';
import { useDocPeek, useDocPeekSurface } from '@/components/docs/doc-peek-context';
import { ReferenceAnchor } from '@/components/docs/references/reference-anchor';
import { ReferenceFileIcon } from '@/components/docs/references/reference-icon';
import { shouldPeekDocsLink } from '@/lib/docs/doc-peek';
import type { Referrer } from '@/lib/docs/doc-references';
import { classifyLink, docsPathAndHashFromHref } from '@/lib/docs/link-kind';

/** 被引用行：文档名 + 更新时间同一行；桌面悬停出站内预览卡。 */
export function ReferenceBacklink({ referrer }: { referrer: Referrer }) {
  const peek = useDocPeek();
  const surface = useDocPeekSurface();
  const router = useRouter();
  const ai = use(AISearchContext);
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const href = referrer.url;

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setHoverPath(null), 160);
  }, [cancelHide]);

  const openDocs = useCallback(() => {
    if (
      peek &&
      !shouldPeekDocsLink({
        splitOpen: peek.open,
        surface,
      })
    ) {
      router.push(href);
      return;
    }
    ai?.setOpen(false);
    peek?.openPeek(href, surface);
  }, [ai, href, peek, router, surface]);

  return (
    <>
      <div
        ref={anchorRef}
        className="relative"
        onMouseEnter={() => {
          if (!peek?.desktop) return;
          const pageUrl = window.location.href;
          if (classifyLink(href, pageUrl) !== 'docs') return;
          const parsed = docsPathAndHashFromHref(href, pageUrl);
          if (!parsed) return;
          cancelHide();
          setHoverPath(parsed.path);
        }}
        onMouseLeave={scheduleHide}
      >
        <ReferenceAnchor
          href={href}
          className="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-fd-accent/50"
        >
          <ReferenceFileIcon />
          <span className="min-w-0 flex-1 truncate font-medium text-fd-foreground">
            {referrer.title}
          </span>
          {referrer.updatedLabel ? (
            <span className="shrink-0 text-xs tabular-nums text-fd-muted-foreground">
              更新于 {referrer.updatedLabel}
            </span>
          ) : null}
        </ReferenceAnchor>
      </div>
      {hoverPath ? (
        <DocsLinkHoverCard
          path={hoverPath}
          anchorRef={anchorRef}
          onBrowse={openDocs}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      ) : null}
    </>
  );
}
