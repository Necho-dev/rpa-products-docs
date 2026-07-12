'use client';

import { Sparkles } from 'lucide-react';
import { IconTooltip } from '@/components/docs/search/icon-tooltip';
import { cn } from '@/lib/core/cn';

export type AiSearchToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
};

function getTooltipLabel(enabled: boolean): string {
  if (enabled) return '智能语义搜索已开启! 你来说, 我来搜!';
  return '开启智能语义搜索, 自然语言即刻搜索!';
}

export function AiSearchToggle({ enabled, onChange, disabled }: AiSearchToggleProps) {
  const tooltip = getTooltipLabel(enabled);

  return (
    <IconTooltip label={tooltip}>
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={enabled ? '智能语义搜索: 已开启' : '智能语义搜索: 已关闭'}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
          enabled
            ? 'bg-fd-primary/10 text-fd-primary'
            : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <Sparkles className="size-4.5" />
      </button>
    </IconTooltip>
  );
}
