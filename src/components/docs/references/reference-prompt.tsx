import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReferencePrompt, ReferencePromptType } from '@/lib/docs/doc-references-core';
import { cn } from '@/lib/core/cn';

const PROMPT_VISUAL: Record<
  ReferencePromptType,
  { Icon: LucideIcon; icon: string; text: string; surface: string }
> = {
  info: {
    Icon: Info,
    icon: 'text-sky-600 dark:text-sky-400',
    text: 'text-sky-800 dark:text-sky-200',
    surface: 'bg-sky-500/12',
  },
  warning: {
    Icon: TriangleAlert,
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-200',
    surface: 'bg-amber-500/14',
  },
  success: {
    Icon: CheckCircle2,
    icon: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-800 dark:text-emerald-200',
    surface: 'bg-emerald-500/12',
  },
  error: {
    Icon: AlertCircle,
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200',
    surface: 'bg-red-500/12',
  },
};

/** type 色高亮 + 加粗文案；底色只铺在提示本身，不铺整张卡 */
export function ReferencePromptQuiet({
  prompt,
  className,
  wrap = false,
}: {
  prompt?: ReferencePrompt;
  className?: string;
  wrap?: boolean;
}) {
  if (!prompt) return null;
  const { Icon, icon, text, surface } = PROMPT_VISUAL[prompt.type];

  return (
    <span
      title={prompt.label}
      className={cn(
        'inline-flex min-w-0 gap-1 rounded-md px-1.5 py-px text-[11px] leading-4',
        wrap ? 'items-start' : 'items-center',
        surface,
        text,
        className,
      )}
    >
      <Icon className={cn('size-3 shrink-0', wrap ? 'mt-0.5' : null, icon)} aria-hidden />
      <span className={cn('font-semibold', wrap ? 'line-clamp-2' : 'truncate')}>{prompt.label}</span>
    </span>
  );
}
