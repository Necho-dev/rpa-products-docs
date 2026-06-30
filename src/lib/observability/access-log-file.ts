import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

export function observabilityLogPath(): string | undefined {
  return trimEnv('DOCS_OBSERVABILITY_LOG_PATH') ?? trimEnv('DOCS_ACCESS_LOG_PATH');
}

/** @deprecated 使用 observabilityLogPath */
export const accessLogPath = observabilityLogPath;

export function isObservabilityLogFileEnabled(): boolean {
  return observabilityLogPath() !== undefined;
}

/** @deprecated 使用 isObservabilityLogFileEnabled */
export const isAccessLogFileEnabled = isObservabilityLogFileEnabled;

/** 按 UTC 日期分文件：{prefix}-YYYYMMDD.jsonl */
export function jsonlLogFilePathForDate(
  prefix: string,
  date = new Date(),
  dir = observabilityLogPath(),
): string | undefined {
  if (!dir) return undefined;
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return path.join(dir, `${prefix}-${ymd}.jsonl`);
}

export function observabilityLogFilePathForDate(
  date = new Date(),
  dir = observabilityLogPath(),
): string | undefined {
  return jsonlLogFilePathForDate('log', date, dir);
}

/** @deprecated 使用 observabilityLogFilePathForDate */
export const accessLogFilePathForDate = observabilityLogFilePathForDate;

const appendFailureLogged = new Set<string>();

function logAppendFailureOnce(prefix: string, filePath: string, message: string): void {
  const key = `${prefix}:${filePath}:${message}`;
  if (appendFailureLogged.has(key)) return;
  appendFailureLogged.add(key);
  console.error(
    `[${prefix}-log] file append failed (${filePath}): ${message} (subsequent failures suppressed; Docker: rebuild image or host \`chown 1001:1001 logs\`)`,
  );
}

/** 异步追加 JSONL，不阻塞请求路径 */
export function appendJsonlLogFile(prefix: string, entry: object): void {
  const filePath = jsonlLogFilePathForDate(prefix);
  if (!filePath) return;

  const line = `${JSON.stringify(entry)}\n`;
  void (async () => {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await appendFile(filePath, line, 'utf8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logAppendFailureOnce(prefix, filePath, message);
    }
  })();
}

/** 异步追加 JSONL（access / mcp / sso 共用 log-YYYYMMDD.jsonl），不阻塞请求路径 */
export function appendObservabilityLogFile(entry: object): void {
  appendJsonlLogFile('log', entry);
}

/** @deprecated 使用 appendObservabilityLogFile */
export const appendAccessLogFile = appendObservabilityLogFile;
