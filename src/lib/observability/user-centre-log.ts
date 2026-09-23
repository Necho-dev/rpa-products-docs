import { isObservabilityLogEnabled } from '@/lib/observability/access-log';
import { appendObservabilityLogFile, isObservabilityLogFileEnabled } from '@/lib/observability/access-log-file';
import {
  formatAccessLogTime,
  formatHttpMethod,
  formatLogMetaGroup,
  formatLogMetaLabel,
  formatObservabilityChannelTag,
  formatObservabilityStatus,
  joinObservabilityStdoutSections,
  shouldUseStdoutColors,
} from '@/lib/observability/access-log-stdout';

export type UserCentreLogOutcome = 'ok' | 'empty' | 'http' | 'timeout' | 'network' | 'skip';

export type UserCentreLogEntry = {
  timestamp: number;
  time: string;
  type: 'user-centre';
  outcome: UserCentreLogOutcome;
  path: string;
  durationMs: number;
  http?: number;
  isSaas?: boolean;
  cache?: 'hit';
  success?: boolean | null;
  code?: string | null;
  msg?: string | null;
  tmAgeMs?: number;
  reason?: string;
};

/** 用户中心 userInfoByAuth 调试行。不含 ed/sh/sg 与用户字段。 */
export function finishUserCentreLog(input: Omit<UserCentreLogEntry, 'timestamp' | 'time' | 'type'>): void {
  if (!isObservabilityLogEnabled()) return;

  const now = Date.now();
  const entry: UserCentreLogEntry = {
    timestamp: now,
    time: new Date(now).toISOString(),
    type: 'user-centre',
    ...input,
  };
  console.log(formatUserCentreStdout(entry));
  if (isObservabilityLogFileEnabled()) {
    appendObservabilityLogFile(entry);
  }
}

export function formatUserCentreStdout(entry: UserCentreLogEntry): string {
  const useColors = shouldUseStdoutColors();
  const DIM = useColors ? '\x1b[2m' : '';
  const RESET = useColors ? '\x1b[0m' : '';
  const GRAY = useColors ? '\x1b[90m' : '';
  const time = formatAccessLogTime(entry.time);
  const timeLabel = useColors ? `${GRAY}${time}${RESET}` : time;
  const status =
    entry.http == null ? (useColors ? `${GRAY}-${RESET}` : '-') : formatObservabilityStatus(entry.http, useColors);
  const duration = useColors ? `${DIM}${entry.durationMs}ms${RESET}` : `${entry.durationMs}ms`;

  const meta: string[] = [formatLogMetaLabel(entry.outcome, useColors)];
  if (entry.cache === 'hit') meta.push(formatLogMetaLabel('cache', useColors));
  if (entry.isSaas !== undefined) meta.push(formatLogMetaLabel(`isSaas=${entry.isSaas}`, useColors));
  if (entry.success != null) meta.push(formatLogMetaLabel(`success=${entry.success}`, useColors));
  if (entry.code) meta.push(formatLogMetaLabel(`code=${entry.code}`, useColors));
  if (entry.msg) meta.push(formatLogMetaLabel(`msg=${entry.msg}`, useColors));
  if (entry.tmAgeMs != null) meta.push(formatLogMetaLabel(`tmAge=${entry.tmAgeMs}ms`, useColors));
  if (entry.reason) meta.push(formatLogMetaLabel(entry.reason, useColors));

  return joinObservabilityStdoutSections([
    timeLabel,
    formatObservabilityChannelTag('user-centre', useColors),
    formatHttpMethod('GET', useColors),
    entry.path,
    status,
    'in',
    duration,
    formatLogMetaGroup(meta, useColors),
  ]);
}
