import { AlarmClockCheck, CalendarSync, LaptopMinimalCheck } from 'lucide-react';
import type { ScheduleAnnotationRow } from '@/lib/docs/format-schedule-meta';
import { cn } from '@/lib/core/cn';

const ROW_ICON = {
  dataReady: LaptopMinimalCheck,
  estimatedDuration: AlarmClockCheck,
  minInterval: CalendarSync,
} as const;

const ROW_TONE = {
  dataReady: 'text-blue-600 dark:text-blue-400',
  estimatedDuration: 'text-orange-600 dark:text-orange-400',
  minInterval: 'text-emerald-600 dark:text-emerald-400',
} as const;

export function DocAnnotations({ rows }: { rows: ScheduleAnnotationRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-fd-border/60">
      <table className="w-full min-w-80 border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border/60 bg-fd-muted/40 text-left text-xs text-fd-muted-foreground">
            <th className="px-3 py-2 font-medium">指标</th>
            <th className="px-3 py-2 font-medium">数值</th>
            <th className="px-3 py-2 font-medium">说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const Icon = ROW_ICON[row.key];
            return (
              <tr key={row.key} className="border-b border-fd-border/40 last:border-b-0">
                <td className="whitespace-nowrap px-3 py-2.5 align-top">
                  <span className="inline-flex items-center gap-1.5 font-medium text-fd-foreground">
                    <Icon className={cn('size-3.5 shrink-0', ROW_TONE[row.key])} aria-hidden />
                    {row.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 align-top font-medium tabular-nums text-fd-foreground">
                  {row.value}
                </td>
                <td className="px-3 py-2.5 align-top leading-relaxed text-fd-muted-foreground">
                  {row.description}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
