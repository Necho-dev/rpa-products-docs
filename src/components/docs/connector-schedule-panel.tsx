import type { ReactNode } from 'react';
import { AlarmClockCheck, CalendarSync, LaptopMinimalCheck } from 'lucide-react';
import { DurationDisplay } from '@/components/docs/duration-display';
import { cn } from '@/lib/core/cn';
import {
  cycleShowsTime,
  DEFAULT_SCHEDULE_DESCRIPTIONS,
  formatDataReadyCycle,
  formatDataReadyCompactValue,
  formatScheduleChipTooltip,
  getDefaultDurationDisplay,
  hasDataReady,
  hasDurationMeta,
  resolveDurationSec,
  resolveScheduleDescription,
  type DataReadyMeta,
  type EstimatedDurationMeta,
  type MinIntervalMeta,
} from '@/lib/docs/format-schedule-meta';

function ScheduleTag({
  icon,
  labelColor,
  chipBg,
  label,
  tooltip,
  children,
}: {
  icon: ReactNode;
  labelColor: string;
  chipBg: string;
  label: string;
  tooltip?: string;
  children: ReactNode;
}) {
  const chip = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-fd-border/60 px-2.5 py-1 text-xs',
        chipBg,
        tooltip && 'cursor-help',
      )}
    >
      {icon}
      <span className={cn('font-semibold', labelColor)}>{label}</span>
      <span className="font-medium text-fd-foreground">{children}</span>
    </span>
  );

  if (!tooltip) return chip;

  return (
    <span className="group/schedule-tip relative inline-flex">
      {chip}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-max min-w-52 max-w-72',
          'rounded-md border border-fd-border bg-fd-popover px-2.5 py-1.5',
          'text-left text-xs leading-relaxed text-fd-popover-foreground shadow-lg',
          'group-hover/schedule-tip:block group-focus-within/schedule-tip:block',
        )}
      >
        {tooltip}
      </span>
    </span>
  );
}

export function ConnectorSchedulePanel({
  dataReady,
  estimatedDuration,
  minInterval,
  className,
}: {
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
  className?: string;
}) {
  const hasAny =
    hasDataReady(dataReady) ||
    hasDurationMeta(estimatedDuration) ||
    hasDurationMeta(minInterval);
  if (!hasAny) return null;

  const durationSec = resolveDurationSec(estimatedDuration);
  const intervalSec = resolveDurationSec(minInterval);
  const cycleLabel = dataReady?.cycle ? formatDataReadyCycle(dataReady.cycle) : null;
  const showTime =
    dataReady?.time != null && (!dataReady.cycle || cycleShowsTime(dataReady.cycle));

  return (
    <div className={cn('not-prose flex flex-wrap items-center gap-1.5', className)}>
      {hasDataReady(dataReady) ? (
        <ScheduleTag
          icon={<LaptopMinimalCheck className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />}
          labelColor="text-blue-700 dark:text-blue-400"
          chipBg="bg-blue-500/8 border-blue-500/20"
          label="数据就绪"
          tooltip={resolveScheduleDescription(
            dataReady?.description,
            DEFAULT_SCHEDULE_DESCRIPTIONS.dataReady,
          )}
        >
          <span className="inline-flex items-center gap-1">
            {cycleLabel ? <span>{cycleLabel}</span> : null}
            {showTime ? (
              <span className="font-mono tabular-nums">{dataReady!.time}</span>
            ) : null}
          </span>
        </ScheduleTag>
      ) : null}

      {durationSec != null ? (
        <ScheduleTag
          icon={<AlarmClockCheck className="size-3.5 shrink-0 text-orange-600 dark:text-orange-400" />}
          labelColor="text-orange-700 dark:text-orange-400"
          chipBg="bg-orange-500/8 border-orange-500/20"
          label="预估耗时"
          tooltip={resolveScheduleDescription(
            estimatedDuration?.description,
            DEFAULT_SCHEDULE_DESCRIPTIONS.estimatedDuration,
          )}
        >
          <DurationDisplay sec={durationSec} unit={estimatedDuration?.unit} />
        </ScheduleTag>
      ) : null}

      {intervalSec != null ? (
        <ScheduleTag
          icon={<CalendarSync className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
          labelColor="text-emerald-700 dark:text-emerald-400"
          chipBg="bg-emerald-500/8 border-emerald-500/20"
          label="最小间隔"
          tooltip={resolveScheduleDescription(
            minInterval?.description,
            DEFAULT_SCHEDULE_DESCRIPTIONS.minInterval,
          )}
        >
          <DurationDisplay sec={intervalSec} unit={minInterval?.unit} />
        </ScheduleTag>
      ) : null}
    </div>
  );
}

/** 卡片内紧凑调度胶囊：仅图标 + 值，悬停展示「指标名: 描述」 */
function CardScheduleChip({
  icon,
  value,
  tooltip,
  chipClassName,
}: {
  icon: ReactNode;
  value: string;
  tooltip: string;
  chipClassName: string;
}) {
  return (
    <span className="group/card-schedule-tip relative inline-flex max-w-full">
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none',
          chipClassName,
          'cursor-help',
        )}
      >
        <span className="inline-flex size-3 shrink-0 items-center justify-center [&>svg]:block [&>svg]:size-3">
          {icon}
        </span>
        <span className="truncate tabular-nums font-medium leading-none text-fd-foreground">
          {value}
        </span>
      </span>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-max min-w-44 max-w-60',
          'rounded-md border border-fd-border bg-fd-popover px-2 py-1.5',
          'text-left text-[10px] leading-relaxed text-fd-popover-foreground shadow-lg',
          'group-hover/card-schedule-tip:block group-focus-within/card-schedule-tip:block',
        )}
      >
        {tooltip}
      </span>
    </span>
  );
}

/** 卡片内极简调度胶囊：数据就绪 + 预估耗时 + 最小间隔 */
export function ConnectorScheduleChips({
  dataReady,
  estimatedDuration,
  minInterval,
  className,
}: {
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
  className?: string;
}) {
  if (
    !hasDataReady(dataReady) &&
    !hasDurationMeta(estimatedDuration) &&
    !hasDurationMeta(minInterval)
  ) {
    return null;
  }

  const durationSec = resolveDurationSec(estimatedDuration);
  const intervalSec = resolveDurationSec(minInterval);
  const dataReadyValue = dataReady ? formatDataReadyCompactValue(dataReady) : null;
  const durationLabel =
    durationSec != null
      ? getDefaultDurationDisplay(durationSec, estimatedDuration?.unit)
      : null;
  const intervalLabel =
    intervalSec != null
      ? getDefaultDurationDisplay(intervalSec, minInterval?.unit)
      : null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {dataReadyValue ? (
        <CardScheduleChip
          icon={
            <LaptopMinimalCheck
              className="size-3 shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden
            />
          }
          value={dataReadyValue}
          tooltip={formatScheduleChipTooltip(
            '数据就绪',
            dataReady?.description,
            DEFAULT_SCHEDULE_DESCRIPTIONS.dataReady,
          )}
          chipClassName="border border-blue-500/20 bg-blue-500/8"
        />
      ) : null}
      {durationLabel ? (
        <CardScheduleChip
          icon={
            <AlarmClockCheck
              className="size-3 shrink-0 text-orange-600 dark:text-orange-400"
              aria-hidden
            />
          }
          value={durationLabel}
          tooltip={formatScheduleChipTooltip(
            '预估耗时',
            estimatedDuration?.description,
            DEFAULT_SCHEDULE_DESCRIPTIONS.estimatedDuration,
          )}
          chipClassName="border border-orange-500/20 bg-orange-500/8"
        />
      ) : null}
      {intervalLabel ? (
        <CardScheduleChip
          icon={
            <CalendarSync
              className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          }
          value={intervalLabel}
          tooltip={formatScheduleChipTooltip(
            '最小间隔',
            minInterval?.description,
            DEFAULT_SCHEDULE_DESCRIPTIONS.minInterval,
          )}
          chipClassName="border border-emerald-500/20 bg-emerald-500/8"
        />
      ) : null}
    </div>
  );
}
