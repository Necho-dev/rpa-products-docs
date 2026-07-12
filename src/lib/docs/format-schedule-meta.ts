
export type DurationDisplayVariant = {
  value: string;
  unit: '秒' | '分钟' | '小时';
};

function formatDurationValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(/\.0$/, '');
}

/**
 * 按时长档位生成可循环展示的单位序列：
 * - < 60 秒：仅秒
 * - ≥ 60 秒且 < 60 分钟：默认分钟 → 秒
 * - ≥ 60 分钟：默认小时 → 分钟 → 秒
 */
export function getDurationDisplayVariants(sec: number): DurationDisplayVariant[] {
  if (sec < 60) {
    return [{ value: String(sec), unit: '秒' }];
  }
  if (sec < 3600) {
    return [
      { value: formatDurationValue(sec / 60), unit: '分钟' },
      { value: String(sec), unit: '秒' },
    ];
  }
  return [
    { value: formatDurationValue(sec / 3600), unit: '小时' },
    { value: formatDurationValue(sec / 60), unit: '分钟' },
    { value: String(sec), unit: '秒' },
  ];
}

export function formatDurationVariant(variant: DurationDisplayVariant): string {
  return `${variant.value} ${variant.unit}`;
}

/** 默认档位展示（卡片等不可交互场景） */
export function getDefaultDurationDisplay(sec: number): string {
  const [first] = getDurationDisplayVariants(sec);
  return formatDurationVariant(first!);
}

const WEEKDAY_LABELS: Record<string, string> = {
  '1': '周一', '2': '周二', '3': '周三',
  '4': '周四', '5': '周五', '6': '周六', '7': '周日',
};

/**
 * 将 dataReady.cycle 解析为中文周期前缀，与 time 组合展示。
 * - "realtime"   → "实时"（独立展示，不附带时间）
 * - "hourly"     → "每小时"（不附带时间）
 * - "daily"      → "每天"
 * - "weekly.3"   → "每周三"
 * - "monthly.15" → "每月 15 日"
 */
export function formatDataReadyCycle(cycle: string): string {
  if (cycle === 'realtime') return '实时';
  if (cycle === 'hourly') return '每小时';
  if (cycle === 'daily') return '每天';
  const weekly = /^weekly\.([1-7])$/.exec(cycle);
  if (weekly) return `每${WEEKDAY_LABELS[weekly[1]!]}`;
  const monthly = /^monthly\.(\d+)$/.exec(cycle);
  if (monthly) return `每月 ${monthly[1]} 日`;
  return cycle;
}

/** 卡片场景：周期 + 完整时间（HH:MM:SS） */
export function formatDataReadyCompactValue(data: DataReadyMeta): string {
  const cycleLabel = data.cycle ? formatDataReadyCycle(data.cycle) : null;
  const showTime = data.time != null && (!data.cycle || cycleShowsTime(data.cycle));
  const time = showTime && data.time ? data.time : null;

  if (cycleLabel && time) return `${cycleLabel} ${time}`;
  if (cycleLabel) return cycleLabel;
  if (time) return time;
  return '';
}

export function formatScheduleChipTooltip(
  label: string,
  customDescription: string | undefined,
  defaultDescription: string,
): string {
  return `${label}: ${resolveScheduleDescription(customDescription, defaultDescription)}`;
}

/**
 * 对于 realtime / hourly，时间戳无意义，不应在 chip 中展示 time。
 */
export function cycleShowsTime(cycle: string): boolean {
  return cycle !== 'realtime' && cycle !== 'hourly';
}

export const DEFAULT_SCHEDULE_DESCRIPTIONS = {
  dataReady: '建议最早调度时间，以平台实际出数时间或测试可获得数据的最早时间为参考；',
  estimatedDuration: '根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发等情况影响；',
  minInterval: '建议最小调度间隔时间，根据平台规定或者平台风控经验估算；',
} as const;

export type DataReadyMeta = {
  time?: string;
  cycle?: string;
  description?: string;
};

export type DurationValueMeta = {
  sec?: number;
  min?: number;
  hour?: number;
  description?: string;
};

export type EstimatedDurationMeta = DurationValueMeta;

export type MinIntervalMeta = DurationValueMeta;

export type ScheduleMetaFields = {
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
};

export function resolveDurationSec(input?: DurationValueMeta): number | null {
  if (!input) return null;
  const candidates: number[] = [];
  if (input.sec != null) candidates.push(input.sec);
  if (input.min != null) candidates.push(input.min * 60);
  if (input.hour != null) candidates.push(input.hour * 3600);
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

export function hasDurationMeta(input?: DurationValueMeta): boolean {
  return resolveDurationSec(input) != null;
}

export function hasDataReady(data?: DataReadyMeta): boolean {
  return data != null && (data.time != null || data.cycle != null);
}

/** 存在任意调度字段即展示调度面板，与 entry 前缀无关。 */
export function hasScheduleMeta(data: ScheduleMetaFields): boolean {
  return (
    hasDataReady(data.dataReady) ||
    hasDurationMeta(data.estimatedDuration) ||
    hasDurationMeta(data.minInterval)
  );
}

export function resolveScheduleDescription(
  custom: string | undefined,
  fallback: string,
): string {
  return custom?.trim() || fallback;
}
