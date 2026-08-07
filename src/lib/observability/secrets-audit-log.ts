import { isObservabilityLogEnabled } from '@/lib/observability/access-log';
import { appendObservabilityLogFile, isObservabilityLogFileEnabled } from '@/lib/observability/access-log-file';
import {
  formatAccessLogTime,
  formatObservabilityChannelTag,
  joinObservabilityStdoutSections,
  shouldUseStdoutColors,
} from '@/lib/observability/access-log-stdout';

export type SecretsLogOutcome = 'load' | 'reload' | 'empty';

export type SecretsLogEntry = {
  timestamp: number;
  time: string;
  type: 'secrets';
  outcome: SecretsLogOutcome;
  path: string;
  /** 当前密钥条数（加载/重载后） */
  secretCount: number;
  /** 重载前密钥条数（仅 mtime 变更触发的 reload / 由有到无的 empty） */
  previousCount?: number;
  /** secretCount - previousCount；有 previousCount 时写入 */
  delta?: number;
  mtimeMs?: number;
};

export function isSecretsAuditLogEnabled(): boolean {
  return isObservabilityLogEnabled();
}

/** stdout 数量段：首次 `count=2`；变更 `count=2→3 (+1)` */
export function formatSecretsCountLabel(entry: Pick<SecretsLogEntry, 'secretCount' | 'previousCount'>): string {
  const after = entry.secretCount;
  if (entry.previousCount === undefined) {
    return `count=${after}`;
  }
  const before = entry.previousCount;
  const delta = after - before;
  const deltaLabel = delta === 0 ? '±0' : delta > 0 ? `+${delta}` : `${delta}`;
  return `count=${before}→${after} (${deltaLabel})`;
}

function formatStdout(entry: SecretsLogEntry): string {
  const useColors = shouldUseStdoutColors();
  const DIM = useColors ? '\x1b[2m' : '';
  const RESET = useColors ? '\x1b[0m' : '';
  const GRAY = useColors ? '\x1b[90m' : '';
  const time = formatAccessLogTime(entry.time);
  const timeLabel = useColors ? `${GRAY}${time}${RESET}` : time;
  return joinObservabilityStdoutSections([
    timeLabel,
    formatObservabilityChannelTag('secrets', useColors),
    `${entry.outcome} ${formatSecretsCountLabel(entry)}`,
    `${DIM}${entry.path}${RESET}`,
  ]);
}

/** secrets.json 首次加载 / mtime 变更重载时记录（不含明文密钥） */
export function finishSecretsLog(input: {
  outcome: SecretsLogOutcome;
  path: string;
  secretCount: number;
  previousCount?: number;
  mtimeMs?: number | null;
}): void {
  if (!isSecretsAuditLogEnabled()) return;

  const now = Date.now();
  const entry: SecretsLogEntry = {
    timestamp: now,
    time: new Date(now).toISOString(),
    type: 'secrets',
    outcome: input.outcome,
    path: input.path,
    secretCount: input.secretCount,
  };
  if (input.previousCount !== undefined) {
    entry.previousCount = input.previousCount;
    entry.delta = input.secretCount - input.previousCount;
  }
  if (input.mtimeMs != null && Number.isFinite(input.mtimeMs)) entry.mtimeMs = input.mtimeMs;

  console.log(formatStdout(entry));
  if (isObservabilityLogFileEnabled()) {
    appendObservabilityLogFile(entry);
  }
}
