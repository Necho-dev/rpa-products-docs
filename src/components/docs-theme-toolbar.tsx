'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { CheckIcon, ChevronDownIcon, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/lib/cn';
import {
  applyFdColorPresetToDocument,
  FD_COLOR_PRESETS,
  FD_COLOR_PRESET_DEFAULT,
  FD_COLOR_PRESET_STORAGE_KEY,
  type FdColorPresetId,
} from '@/lib/fd-color-preset';

function readStoredPreset(): FdColorPresetId {
  if (typeof window === 'undefined') return FD_COLOR_PRESET_DEFAULT;
  try {
    const v = localStorage.getItem(FD_COLOR_PRESET_STORAGE_KEY);
    if (v && FD_COLOR_PRESETS.some((p) => p.id === v)) return v as FdColorPresetId;
  } catch {
    /* ignore */
  }
  return FD_COLOR_PRESET_DEFAULT;
}

const MODE_ITEMS = [
  ['light', Sun, '浅色'] as const,
  ['dark', Moon, '深色'] as const,
  ['system', Monitor, '跟随系统'] as const,
];

/**
 * 明暗三钮常驻底栏（一键切换）；配色预设仍在「主题」Popover 内（与 MCP 下拉一致）。
 */
export function DocsThemeToolbar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<FdColorPresetId>(readStoredPreset);
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    applyFdColorPresetToDocument(preset);
  }, [preset]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn('inline-flex shrink-0 items-center gap-1.5', className)}>
      <div
        className="inline-flex h-8 items-center rounded-full border border-fd-border bg-fd-background p-0.5"
        data-theme-toggle=""
      >
        {MODE_ITEMS.map(([key, Icon, label]) => {
          const value = mounted ? theme : null;
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={active}
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-fd-muted-foreground transition-colors',
                'hover:bg-fd-accent hover:text-fd-accent-foreground',
                active && 'bg-fd-accent text-fd-accent-foreground',
              )}
              onClick={() => setTheme(key)}
            >
              <Icon className="size-3.5" fill="currentColor" />
            </button>
          );
        })}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            buttonVariants({ color: 'secondary', size: 'sm' }),
            'h-8 shrink-0 gap-2 data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground',
            'rounded-lg',
          )}
          aria-label="配色预设"
        >
          <Palette className="size-3.5 text-fd-muted-foreground" />
          <span className="max-lg:sr-only">主题</span>
          <ChevronDownIcon className="size-3.5 text-fd-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={6}
          className={cn(
            'flex min-w-0 w-44 max-w-[calc(100vw-1rem)] flex-col gap-0 p-0.5',
            /* min-w-0 覆盖 Fumadocs Popover 默认 min-w-[240px]，与固定 w-44 组合收窄 */
          )}
        >
          <p className="px-1.5 pb-0.5 pt-0.5 text-[10px] font-medium leading-tight text-fd-muted-foreground">
            配色
          </p>
          <div
            className={cn(
              'flex max-h-[min(42vh,13.5rem)] flex-col gap-0 overflow-y-auto',
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            )}
          >
            {FD_COLOR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPreset(p.id);
                  applyFdColorPresetToDocument(p.id);
                  setOpen(false);
                }}
                className={cn(
                  'inline-flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs leading-snug',
                  'hover:bg-fd-accent hover:text-fd-accent-foreground',
                  preset === p.id && 'bg-fd-accent/60 text-fd-accent-foreground',
                )}
              >
                <CheckIcon
                  className={cn(
                    'size-3.5 shrink-0',
                    preset === p.id ? 'text-fd-primary' : 'opacity-0',
                  )}
                  aria-hidden={preset !== p.id}
                />
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
