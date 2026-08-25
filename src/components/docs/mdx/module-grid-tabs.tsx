'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Cards } from 'fumadocs-ui/components/card';
import { cn } from '@/lib/core/cn';
import type { ModuleGroupData } from '@/lib/docs/source/collect-sibling-modules';
import type { ModuleGridLayout } from '@/lib/docs/source/module-group-config';
import type { ModuleGridGroupAnchor } from '@/lib/docs/source/module-grid-toc';
import { groupKeyFromLocationHash } from '@/lib/docs/source/module-grid-toc';
import { renderGroupIcon, renderModuleIcon } from '@/lib/docs/icons/client';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';
import { ModuleCard } from '@/components/docs/mdx/module-card';

/**
 * 按网格自身宽度自动分列（非视口断点）。
 * min 20rem：正文区 ~900px → 2 列；~1300px → 4 列；手机 → 1 列。
 */
const MODULE_CARDS_GRID_CLASS =
  '![grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4 md:gap-5';

function ModuleCardIcon({ icon }: { icon: ModuleIconConfig }) {
  // size-full：由 ModuleCardTitleIcon 外框约束；位图 / Lucide 统一走 module.icon
  return renderModuleIcon(icon, 'size-full');
}

function ModuleCardsGrid({
  modules,
}: {
  modules: ModuleGroupData['modules'];
}) {
  return (
    <Cards className={MODULE_CARDS_GRID_CLASS}>
      {modules.map((mod) => (
        <ModuleCard
          key={mod.href}
          title={mod.title}
          description={mod.description}
          badge={mod.badge}
          href={mod.href}
          code={mod.code}
          url={mod.url}
          coverUrl={mod.coverUrl}
          dataReady={mod.dataReady}
          estimatedDuration={mod.estimatedDuration}
          minInterval={mod.minInterval}
          icon={mod.icon ? <ModuleCardIcon icon={mod.icon} /> : undefined}
        />
      ))}
    </Cards>
  );
}

function GroupTabButton({
  group,
  active,
  onClick,
}: {
  group: ModuleGroupData;
  active: boolean;
  onClick: () => void;
}) {
  const count = group.modules.length;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={`${group.label}，${count} 个模块`}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-bold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        active
          ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary shadow-sm'
          : 'border-fd-border/70 bg-fd-card/60 text-fd-foreground hover:border-fd-border hover:bg-fd-accent/50',
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-md border',
          active
            ? 'border-fd-primary/25 bg-fd-primary/10 text-fd-primary'
            : 'border-fd-border/60 bg-fd-muted/40 text-fd-muted-foreground',
        )}
      >
        {renderGroupIcon(group.key, group.icon, {
          className: 'size-3.5',
          'aria-hidden': true,
        })}
      </span>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap',
          active ? 'text-fd-primary' : 'text-fd-foreground',
        )}
      >
        {group.label}
      </span>
      <span
        className={cn(
          'inline-flex size-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums',
          active
            ? 'bg-fd-primary text-fd-primary-foreground'
            : 'bg-fd-muted text-fd-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ModuleGridAnchors({ groupAnchors }: { groupAnchors: ModuleGridGroupAnchor[] }) {
  return (
    <div className="pointer-events-none relative h-0" aria-hidden>
      {groupAnchors.map((anchor, index) => (
        <span
          key={anchor.key}
          id={anchor.anchorId}
          className="absolute block scroll-mt-20"
          style={{ top: `${index * 2}px` }}
        />
      ))}
    </div>
  );
}

function ModuleGridStack({ groups }: { groups: ModuleGroupData[] }) {
  return (
    <div className="not-prose w-full">
      {groups.map((group, index) => (
        <section key={group.key}>
          <h3
            id={group.key}
            className={cn(
              'scroll-mt-20 text-xl font-semibold tracking-tight text-fd-foreground',
              index === 0 ? 'mt-0 mb-4' : 'mt-8 mb-4',
            )}
          >
            {group.label}
          </h3>
          <ModuleCardsGrid modules={group.modules} />
        </section>
      ))}
    </div>
  );
}

/** 平铺样式设计: 不显示分类标题/Tab, 按分组顺序把卡片铺成一张网格 */
function ModuleGridFlat({ groups }: { groups: ModuleGroupData[] }) {
  const modules = groups.flatMap((group) => group.modules);
  if (modules.length === 0) return null;

  return (
    <div className="not-prose w-full">
      <ModuleCardsGrid modules={modules} />
    </div>
  );
}

function groupKeyFromTocHref(
  href: string,
  groups: ModuleGroupData[],
  groupAnchors?: ModuleGridGroupAnchor[],
): string | null {
  if (groupAnchors?.length) {
    const fromAnchor = groupKeyFromLocationHash(href, groupAnchors);
    if (fromAnchor) return fromAnchor;
  }
  let raw = href.replace(/^#/, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep */
  }
  if (raw.startsWith('peek--')) raw = raw.slice('peek--'.length);
  const scoped = raw.match(/^ref-.+--(.+)$/u);
  if (scoped?.[1]) raw = scoped[1];
  return groups.find((g) => raw === g.key || raw.endsWith(`-${g.key}`))?.key ?? null;
}

export function ModuleGridTabs({
  groups,
  groupAnchors,
  layout = 'tabs',
}: {
  groups: ModuleGroupData[];
  groupAnchors?: ModuleGridGroupAnchor[];
  layout?: ModuleGridLayout;
}) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const nonEmpty = groups.filter((g) => g.modules.length > 0);
  const [activeKey, setActiveKey] = useState(nonEmpty[0]?.key ?? '');

  const groupKeys = nonEmpty.map((g) => g.key).join('\0');

  useEffect(() => {
    if (layout !== 'tabs' || nonEmpty.length < 2) return;

    const tocRoot = () =>
      rootRef.current?.closest('[data-doc-peek-panel]')?.querySelector('[data-doc-peek-toc]') ??
      document.getElementById('nd-toc');

    const applyFromHref = (href: string | null | undefined) => {
      if (!href) return;
      const key = groupKeyFromTocHref(href, nonEmpty, groupAnchors);
      if (key) setActiveKey(key);
    };

    const applyHash = () => applyFromHref(window.location.hash);
    const applyToc = () => {
      const active = tocRoot()?.querySelector<HTMLAnchorElement>('a[data-active="true"]');
      applyFromHref(active?.getAttribute('href'));
    };
    const onTocClick = (event: MouseEvent) => {
      const root = tocRoot();
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!root || !link || !root.contains(link)) return;
      applyFromHref(link.getAttribute('href'));
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
  }, [groupAnchors, groupKeys, layout, nonEmpty]);

  const selectTab = useCallback(
    (key: string) => {
      setActiveKey(key);

      if (!groupAnchors?.length) return;
      const anchor = groupAnchors.find((item) => item.key === key);
      if (!anchor) return;

      window.history.replaceState(null, '', `${pathname}#${anchor.anchorId}`);
    },
    [groupAnchors, pathname, setActiveKey],
  );

  if (nonEmpty.length === 0) return null;

  if (layout === 'stack') {
    return <ModuleGridStack groups={nonEmpty} />;
  }

  if (layout === 'flat') {
    return <ModuleGridFlat groups={nonEmpty} />;
  }

  if (nonEmpty.length === 1) {
    return (
      <div className="not-prose w-full">
        <ModuleCardsGrid modules={nonEmpty[0]!.modules} />
      </div>
    );
  }

  const activeGroup =
    nonEmpty.find((g) => g.key === activeKey) ?? nonEmpty[0]!;
  const anchors = groupAnchors ?? [];

  return (
    <div ref={rootRef} className="not-prose w-full space-y-4">
      {anchors.length > 0 ? <ModuleGridAnchors groupAnchors={anchors} /> : null}
      <div
        role="tablist"
        aria-label="模块分组"
        className="flex flex-wrap items-center gap-2"
      >
        {nonEmpty.map((group) => (
          <GroupTabButton
            key={group.key}
            group={group}
            active={activeGroup.key === group.key}
            onClick={() => selectTab(group.key)}
          />
        ))}
      </div>

      <div role="tabpanel" className="pt-1">
        <ModuleCardsGrid modules={activeGroup.modules} />
      </div>
    </div>
  );
}
