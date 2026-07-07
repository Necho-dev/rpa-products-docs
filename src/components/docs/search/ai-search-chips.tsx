'use client';

import { cn } from '@/lib/core/cn';
import {
  getAiSearchErrorMessage,
  type AiSearchErrorKind,
  type AiSearchInterpretation,
} from '@/components/docs/search/use-docs-search-enhanced';

export type AiSearchChipsProps = {
  interpretation?: AiSearchInterpretation | null;
  selectedKeywords: Set<string>;
  onToggle: (keyword: string) => void;
  onSelectAll: () => void;
  degraded?: boolean;
  aiError?: AiSearchErrorKind | null;
};

export function AiSearchChips({
  interpretation,
  selectedKeywords,
  onToggle,
  onSelectAll,
  degraded,
  aiError,
}: AiSearchChipsProps) {
  const chipLabels = interpretation
    ? [
        ...interpretation.keywords,
        ...(interpretation.docFamilies ?? []).filter((f) => !interpretation.keywords.includes(f)),
      ]
    : [];
  const allSelected = chipLabels.length > 0 && chipLabels.every((k) => selectedKeywords.has(k));
  const errorMessage = aiError ? getAiSearchErrorMessage(aiError) : null;

  if (!interpretation && !errorMessage) return null;

  return (
    <div className="flex flex-col gap-2 border-b px-3 py-2.5">
      {interpretation && (
        <p className="text-xs text-fd-muted-foreground">
          <span className="font-medium text-fd-foreground/80">智能语义理解:</span>
          {interpretation.summary}
        </p>
      )}
      {errorMessage && (
        <p
          className={cn(
            'text-xs',
            aiError === 'rate_limited'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-fd-muted-foreground',
          )}
        >
          {errorMessage}
        </p>
      )}
      {chipLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chipLabels.map((keyword) => {
            const active = selectedKeywords.has(keyword);
            return (
              <button
                key={keyword}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(keyword)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-fd-primary/40 bg-fd-primary/10 text-fd-primary'
                    : 'border-fd-border text-fd-muted-foreground hover:bg-fd-accent',
                )}
              >
                {keyword}
              </button>
            );
          })}
          {!allSelected && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-fd-muted-foreground underline underline-offset-2 hover:text-fd-foreground"
            >
              全选
            </button>
          )}
        </div>
      )}
      {degraded && !errorMessage && (
        <p className="text-xs text-fd-muted-foreground/80">已回退为关键词搜索</p>
      )}
    </div>
  );
}
