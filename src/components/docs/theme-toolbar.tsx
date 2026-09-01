'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { CheckIcon, ChevronDownIcon, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/lib/core/cn';
import {
  applyFdColorPresetToDocument,
  FD_COLOR_PRESETS,
  FD_COLOR_PRESET_DEFAULT,
  FD_COLOR_PRESET_STORAGE_KEY,
  FD_COLOR_PRESET_SWATCH,
  isFdColorPresetId,
  type FdColorPresetId,
} from '@/lib/ui/fd-color-preset';

function readCookiePreset(): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${FD_COLOR_PRESET_STORAGE_KEY}=`;
  const hit = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.slice(prefix.length));
  } catch {
    return hit.slice(prefix.length);
  }
}

function readStoredPreset(): FdColorPresetId {
  if (typeof window === 'undefined') return FD_COLOR_PRESET_DEFAULT;
  try {
    const fromStorage = localStorage.getItem(FD_COLOR_PRESET_STORAGE_KEY);
    if (isFdColorPresetId(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  const fromCookie = readCookiePreset();
  if (isFdColorPresetId(fromCookie)) return fromCookie;
  return FD_COLOR_PRESET_DEFAULT;
}

const MODE_ITEMS = [
  ['light', Sun, '浅色'] as const,
  ['dark', Moon, '深色'] as const,
  ['system', Monitor, '跟随系统'] as const,
] as const;

function PresetSwatch({
  presetId,
  className,
}: {
  presetId: FdColorPresetId;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'size-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20',
        className,
      )}
      style={{ backgroundColor: FD_COLOR_PRESET_SWATCH[presetId] }}
      aria-hidden
    />
  );
}

/**
 * 顶栏主题控件：明暗三钮 + 配色下拉，共用同一描边圆角壳，避免胶囊/实心按钮混搭。
 */
export function DocsThemeToolbar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<FdColorPresetId>(readStoredPreset);
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const activePresetLabel =
    FD_COLOR_PRESETS.find((p) => p.id === preset)?.label ?? '主题';

  useLayoutEffect(() => {
    applyFdColorPresetToDocument(preset);
  }, [preset]);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  return (
    <div
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-lg border border-fd-border/80 bg-fd-background/80 p-0.5',
        className,
      )}
      data-theme-toggle=""
    >
      <div className="inline-flex items-center">
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
                'flex size-7 items-center justify-center rounded-md text-fd-muted-foreground transition-colors',
                'hover:bg-fd-accent/70 hover:text-fd-accent-foreground',
                active && 'bg-fd-accent text-fd-accent-foreground shadow-sm',
              )}
              onClick={() => setTheme(key)}
            >
              <Icon className="size-3.5" fill="currentColor" strokeWidth={1.75} />
            </button>
          );
        })}
      </div>

      <div className="mx-1.5 h-4 w-px shrink-0 bg-fd-border/80" aria-hidden />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5',
            'text-[12px] font-medium tracking-wide text-fd-muted-foreground transition-colors',
            'hover:bg-fd-accent/70 hover:text-fd-accent-foreground',
            'data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground',
          )}
          aria-label={`配色预设：${activePresetLabel}`}
        >
          <PresetSwatch presetId={preset} />
          <span className="max-lg:sr-only w-10 truncate text-left">
            {activePresetLabel}
          </span>
          <ChevronDownIcon
            className={cn(
              'size-3 shrink-0 opacity-70 transition-transform',
              open && 'rotate-180',
            )}
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={8}
          className={cn(
            'z-80 w-44 min-w-0 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-fd-border/80 p-1 shadow-md',
            'bg-fd-popover text-fd-popover-foreground',
          )}
        >
          <div
            className={cn(
              'flex max-h-[min(50vh,16rem)] flex-col gap-0.5 overflow-y-auto',
              '[scrollbar-width:thin]',
            )}
          >
            {FD_COLOR_PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPreset(p.id);
                    applyFdColorPresetToDocument(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] leading-none tracking-wide',
                    'text-fd-muted-foreground transition-colors',
                    'hover:bg-fd-accent/70 hover:text-fd-accent-foreground',
                    active && 'bg-fd-accent text-fd-accent-foreground',
                  )}
                >
                  <PresetSwatch presetId={p.id} />
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <CheckIcon
                    className={cn(
                      'size-3.5 shrink-0 text-fd-primary',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                    strokeWidth={2}
                    aria-hidden={!active}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
