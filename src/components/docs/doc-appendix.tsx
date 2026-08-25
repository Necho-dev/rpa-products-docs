'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ReferenceBacklink } from '@/components/docs/references/reference-backlink';
import { DocAnnotations } from '@/components/docs/doc-annotations';
import type { Referrer } from '@/lib/docs/doc-references';
import {
  appendixTabFromHeadingId,
  DOC_ANNOTATIONS_ID,
  DOC_APPENDIX_ID,
  DOC_CITED_BY_ID,
  type AppendixTab,
} from '@/lib/docs/doc-appendix';
import type { ScheduleAnnotationRow } from '@/lib/docs/format-schedule-meta';
import { cn } from '@/lib/core/cn';

/**
 * 页底元信息：同一区块内 Tab 切换「指标注释 / 本文被引用」，跟随右侧目录高亮。
 */
export function DocAppendix({
  referrers,
  annotations,
  className,
}: {
  referrers: Referrer[];
  annotations: ScheduleAnnotationRow[];
  className?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const hasCited = referrers.length > 0;
  const hasNotes = annotations.length > 0;
  const useTabs = hasCited && hasNotes;

  const tabFromLocation = useCallback((): AppendixTab => {
    if (typeof window === 'undefined') return hasNotes ? 'notes' : 'cited';
    return (
      appendixTabFromHeadingId(window.location.hash, { hasCited, hasNotes }) ??
      (hasNotes ? 'notes' : 'cited')
    );
  }, [hasCited, hasNotes]);

  const [tab, setTab] = useState<AppendixTab>(hasNotes ? 'notes' : 'cited');

  useEffect(() => {
    const applyHash = () => setTab(tabFromLocation());
    const tocRoot = () =>
      rootRef.current?.closest('[data-doc-peek-panel]')?.querySelector('[data-doc-peek-toc]') ??
      document.getElementById('nd-toc');

    const applyToc = () => {
      const active = tocRoot()?.querySelector<HTMLAnchorElement>('a[data-active="true"]');
      const href = active?.getAttribute('href');
      if (!href) return;
      const next = appendixTabFromHeadingId(href, { hasCited, hasNotes });
      if (next) setTab(next);
    };

    const onTocClick = (event: MouseEvent) => {
      const root = tocRoot();
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!root || !link || !root.contains(link)) return;
      const next = appendixTabFromHeadingId(link.getAttribute('href') ?? '', { hasCited, hasNotes });
      if (next) setTab(next);
    };

    applyHash();
    applyToc();
    window.addEventListener('hashchange', applyHash);
    window.addEventListener('popstate', applyHash);
    document.addEventListener('click', onTocClick, true);
    const toc = tocRoot();
    const mo = toc ? new MutationObserver(applyToc) : null;
    if (toc) mo?.observe(toc, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
    return () => {
      window.removeEventListener('hashchange', applyHash);
      window.removeEventListener('popstate', applyHash);
      document.removeEventListener('click', onTocClick, true);
      mo?.disconnect();
    };
  }, [hasCited, hasNotes, tabFromLocation]);

  if (!hasCited && !hasNotes) return null;

  const showCited = !useTabs ? hasCited : tab === 'cited';
  const showNotes = !useTabs ? hasNotes : tab === 'notes';

  return (
    <section
      ref={rootRef}
      id={DOC_APPENDIX_ID}
      aria-label="文档补充"
      className={cn('not-prose mt-10 mb-12', className)}
    >
      {useTabs ? (
        <div className="mb-3 flex items-end gap-6 border-b border-fd-border/70" role="tablist">
          <TabHeading
            id={DOC_ANNOTATIONS_ID}
            active={tab === 'notes'}
            onSelect={(el) => {
              setTab('notes');
              writeAppendixHash(DOC_ANNOTATIONS_ID, el);
            }}
          >
            指标注释({annotations.length})
          </TabHeading>
          <TabHeading
            id={DOC_CITED_BY_ID}
            active={tab === 'cited'}
            onSelect={(el) => {
              setTab('cited');
              writeAppendixHash(DOC_CITED_BY_ID, el);
            }}
          >
            本文被引用({referrers.length})
          </TabHeading>
        </div>
      ) : null}

      {hasNotes ? (
        <div hidden={useTabs && !showNotes}>
          {useTabs ? null : (
            <h2
              id={DOC_ANNOTATIONS_ID}
              className="mb-3 scroll-mt-24 text-sm font-semibold text-fd-foreground"
            >
              指标注释({annotations.length})
            </h2>
          )}
          <DocAnnotations rows={annotations} />
        </div>
      ) : null}

      {hasCited ? (
        <div hidden={useTabs && !showCited}>
          {useTabs ? null : (
            <h2
              id={DOC_CITED_BY_ID}
              className="mb-3 scroll-mt-24 text-sm font-semibold text-fd-foreground"
            >
              本文被引用({referrers.length})
            </h2>
          )}
          <ul className="flex flex-col">
            {referrers.map((referrer) => (
              <li key={referrer.url}>
                <ReferenceBacklink referrer={referrer} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function writeAppendixHash(id: string, el: HTMLElement) {
  const prefix = el.closest('[data-doc-peek-panel], [data-doc-peek]') ? 'peek--' : '';
  history.replaceState(null, '', `#${prefix}${id}`);
}

function TabHeading({
  id,
  active,
  onSelect,
  children,
}: {
  id: string;
  active: boolean;
  onSelect: (el: HTMLElement) => void;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="mb-0 scroll-mt-24 text-sm font-medium">
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={(e) => onSelect(e.currentTarget)}
        className={cn(
          '-mb-px border-b-2 px-0.5 pb-2 text-sm transition-colors',
          active
            ? 'border-fd-foreground font-semibold text-fd-foreground'
            : 'border-transparent font-medium text-fd-muted-foreground hover:text-fd-foreground',
        )}
      >
        {children}
      </button>
    </h2>
  );
}
