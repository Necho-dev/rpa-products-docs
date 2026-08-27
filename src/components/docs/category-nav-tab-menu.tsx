'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { Anchor as PopoverAnchor } from '@radix-ui/react-popover';
import { Popover, PopoverContent } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/lib/core/cn';
import { renderModuleIcon } from '@/lib/docs/icons/client';
import {
  CATEGORY_NAV_QUERY,
  categoryNavHref,
  matchCategoryNavModel,
  resolveCategoryNavSelection,
  type CategoryNavModel,
} from '@/lib/docs/source/category-nav';

export function CategoryNavTabMenu({
  label,
  model,
}: {
  label: ReactNode;
  model: CategoryNavModel | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState<number | undefined>();
  const [alignOffset, setAlignOffset] = useState(0);
  const innerRef = useRef<HTMLSpanElement>(null);

  const syncMenuToTab = () => {
    const inner = innerRef.current;
    const tab = inner?.closest('a');
    if (!inner || !tab) return;
    const t = tab.getBoundingClientRect();
    const i = inner.getBoundingClientRect();
    setMenuWidth(Math.round(t.width));
    setAlignOffset(Math.round(t.left - i.left));
  };

  if (!model) return label;

  const inPartition = matchCategoryNavModel(pathname, [model]) != null;
  const selectedKey = inPartition
    ? resolveCategoryNavSelection(searchParams.get(CATEGORY_NAV_QUERY), model)
    : null;

  const chevronClass =
    model.placement === 'header' ? 'lg:hidden' : undefined;

  const pick = (key: string | null) => {
    setOpen(false);
    router.push(categoryNavHref(model, key));
  };

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          ref={innerRef}
          className="inline-flex items-center gap-0.5 -ml-5.5 pl-5.5"
        >
          <span>{label}</span>
          <span
            role="button"
            tabIndex={0}
            aria-label={`打开${model.title}`}
            aria-expanded={open}
            data-category-nav-trigger=""
            className={cn(
              'inline-flex size-4.5 items-center justify-center rounded-md text-current/70 hover:bg-black/5 hover:text-current dark:hover:bg-white/10',
              chevronClass,
            )}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              syncMenuToTab();
              setOpen((v) => !v);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                syncMenuToTab();
                setOpen((v) => !v);
              }
            }}
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', open && 'rotate-180')}
            />
          </span>
        </span>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        alignOffset={alignOffset}
        sideOffset={8}
        collisionPadding={8}
        className="z-80 min-w-0 w-(--category-nav-menu-width) max-w-none p-1"
        style={
          {
            '--category-nav-menu-width': menuWidth ? `${menuWidth}px` : undefined,
          } as CSSProperties
        }
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (
            e.target instanceof Element &&
            e.target.closest('[data-category-nav-trigger]')
          ) {
            e.preventDefault();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <MenuRow
          label="全部"
          active={inPartition && selectedKey == null}
          onSelect={() => pick(null)}
        />
        {model.items.map((opt) => (
          <MenuRow
            key={opt.key}
            label={opt.item}
            icon={opt.icon}
            active={selectedKey === opt.key}
            onSelect={() => pick(opt.key)}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  label,
  icon,
  active,
  onSelect,
}: {
  label: string;
  icon?: { comp: string; color?: string };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-fd-primary/10 text-fd-primary'
          : 'text-fd-foreground hover:bg-fd-accent',
      )}
    >
      {icon ? (
        <span className="inline-flex size-4.5 shrink-0 items-center justify-center [&_img]:size-full [&_img]:object-contain [&_svg]:size-full">
          {renderModuleIcon(icon, 'size-full')}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {active ? <Check className="size-3.5 shrink-0" /> : null}
    </button>
  );
}
