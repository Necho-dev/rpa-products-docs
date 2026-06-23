'use client';

import { createElement, useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Cards } from 'fumadocs-ui/components/card';
import { cn } from '@/lib/core/cn';
import type { ModuleGroupData } from '@/lib/docs/source/collect-sibling-modules';
import type { ModuleGridLayout } from '@/lib/docs/source/module-group-config';
import type { ModuleGridGroupAnchor } from '@/lib/docs/source/module-grid-toc';
import { groupKeyFromLocationHash } from '@/lib/docs/source/module-grid-toc';
import { lookupLucideIcon, renderGroupIcon } from '@/lib/docs/source/lucide-group-icon';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';
import { ModuleCard } from '@/components/docs/mdx/module-card';

/**
 * 按网格自身宽度自动分列（非视口断点）。
 * min 20rem：正文区 ~900px → 2 列；~1300px → 4 列；手机 → 1 列。
 */
const MODULE_CARDS_GRID_CLASS =
  '![grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4 md:gap-5';

function ModuleCardIcon({ icon }: { icon: ModuleIconConfig }) {
  const Icon = lookupLucideIcon(icon.comp);
  if (!Icon) return null;
  return createElement(Icon, {
    className: 'size-4',
    ...(icon.color ? { style: { color: icon.color } } : {}),
    'aria-hidden': true,
  });
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
          'inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums',
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
  const nonEmpty = groups.filter((g) => g.modules.length > 0);
  const [activeKey, setActiveKey] = useState(nonEmpty[0]?.key ?? '');

  useEffect(() => {
    if (!groupAnchors?.length) return;

    const syncFromHash = () => {
      const key = groupKeyFromLocationHash(window.location.hash, groupAnchors);
      if (key) setActiveKey(key);
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [groupAnchors]);

  const selectTab = useCallback(
    (key: string) => {
      setActiveKey(key);

      if (!groupAnchors?.length) return;
      const anchor = groupAnchors.find((item) => item.key === key);
      if (!anchor) return;

      window.history.replaceState(null, '', `${pathname}#${anchor.anchorId}`);
    },
    [groupAnchors, pathname],
  );

  if (nonEmpty.length === 0) return null;

  if (layout === 'stack') {
    return <ModuleGridStack groups={nonEmpty} />;
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
    <div className="not-prose w-full space-y-4">
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
