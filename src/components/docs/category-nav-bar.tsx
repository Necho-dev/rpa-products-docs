'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/core/cn';
import { renderModuleIcon } from '@/lib/docs/icons/client';
import { useCategoryNav } from '@/components/docs/category-nav-context';

export function CategoryNavBar({ className }: { className?: string }) {
  const { model, selectedKey, setSelectedKey } = useCategoryNav();
  if (!model || model.placement !== 'header') return null;

  return (
    <HeaderCategoryNav
      title={model.title}
      className={className}
      selectedKey={selectedKey}
      setSelectedKey={setSelectedKey}
      items={model.items}
    />
  );
}

function HeaderCategoryNav({
  title,
  className,
  selectedKey,
  setSelectedKey,
  items,
}: {
  title: string;
  className?: string;
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  items: readonly { key: string; item: string; icon?: { comp: string; color?: string } }[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [caretX, setCaretX] = useState<number | null>(null);

  useLayoutEffect(() => {
    const row = rootRef.current;
    if (!row) return;

    const measure = () => {
      const active = document.querySelector<HTMLElement>(
        '#nd-subnav [data-header-tabs] a.text-fd-primary',
      );
      if (!active) {
        setCaretX(null);
        return;
      }
      const tab = active.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      setCaretX(tab.left + tab.width / 2 - box.left);
    };

    measure();
    const tabs = document.querySelector('#nd-subnav [data-header-tabs]');
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    if (tabs) ro.observe(tabs);
    window.addEventListener('resize', measure);
    tabs?.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      tabs?.removeEventListener('scroll', measure);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-category-nav="header"
      role="navigation"
      aria-label={title}
      className={cn(
        'relative flex min-w-0 items-center overflow-visible max-lg:hidden',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-fd-border/40"
      />
      {caretX != null ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 z-1 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-fd-border/40 bg-fd-background"
          style={{ left: caretX }}
        />
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5">
        <ChipRow
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          items={items}
        />
      </div>
    </div>
  );
}

function ChipRow({
  selectedKey,
  setSelectedKey,
  items,
}: {
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  items: readonly { key: string; item: string; icon?: { comp: string; color?: string } }[];
}) {
  return (
    <>
      <CategoryNavChip
        label="全部"
        active={selectedKey == null}
        onClick={() => setSelectedKey(null)}
      />
      {items.map((opt) => (
        <CategoryNavChip
          key={opt.key}
          label={opt.item}
          icon={opt.icon}
          active={selectedKey === opt.key}
          onClick={() => setSelectedKey(opt.key)}
        />
      ))}
    </>
  );
}

function CategoryNavChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: { comp: string; color?: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[0.8125rem] leading-5 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        active
          ? 'bg-fd-primary/12 text-fd-primary'
          : 'bg-fd-secondary/80 text-fd-muted-foreground hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
      )}
    >
      {icon ? (
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center [&_img]:size-full [&_img]:object-contain [&_svg]:size-full"
          aria-hidden
        >
          {renderModuleIcon(icon, 'size-full')}
        </span>
      ) : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
