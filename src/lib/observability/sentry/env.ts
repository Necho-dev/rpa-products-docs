/** Sentry 服务端 / Edge 运行时开关。浏览器 DSN 走 layout 注入的 public-config，勿在 `'use client'` 引用本文件。 */
function trimValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

/**
 * 唯一 DSN；未配置则视为关闭 Sentry（含 Errors / Logs / Trace / Replay / 业务审计）。
 */
export function getSentryDsn(): string | undefined {
  return trimValue(process.env.SENTRY_DSN);
}

/** 默认 `dev`；生产请显式设为 `production` / `staging` 等 */
export function getSentryEnvironment(): string {
  return trimValue(process.env.SENTRY_ENVIRONMENT) ?? 'dev';
}

/**
 * Sentry release / git sha。
 * 由构建脚本（deplpy）注入 Docker ARG / 运行时 ENV，**不是** `.env` 配置项。
 */
export function getSentryRelease(): string | undefined {
  return (
    trimValue(process.env.SENTRY_RELEASE) ??
    trimValue(process.env.GIT_SHA) ??
    trimValue(process.env.VERCEL_GIT_COMMIT_SHA)
  );
}

export function isSentryEnabled(): boolean {
  return getSentryDsn() !== undefined;
}

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return fallback;
}

/**
 * Sentry Trace 采样率(SENTRY_TRACES_SAMPLE_RATE)
 * 未配置默认值 1: 站内流量有限, 且 MCP Insights 依赖 Trace 不被抽稀
 */
export function getSentryTracesSampleRate(): number {
  return parseSampleRate(trimValue(process.env.SENTRY_TRACES_SAMPLE_RATE), 1);
}

/** Sentry Logs 开关（SENTRY_ENABLE_LOGS），默认开启；仍受 DSN 总开关约束 */
export function getSentryEnableLogs(): boolean {
  return parseBool(trimValue(process.env.SENTRY_ENABLE_LOGS), true);
}

/** 是否上报默认 PII（SENTRY_SEND_DEFAULT_PII），默认开启 */
export function getSentrySendDefaultPii(): boolean {
  return parseBool(trimValue(process.env.SENTRY_SEND_DEFAULT_PII), true);
}

/**
 * 事务级 Profile 采样率（相对已采样 Trace，SENTRY_PROFILES_SAMPLE_RATE）。
 * 未配置默认 0：不开启 CPU Profile，避免未声明就全量剖析。
 */
export function getSentryProfilesSampleRate(): number {
  return parseSampleRate(trimValue(process.env.SENTRY_PROFILES_SAMPLE_RATE), 0);
}

/**
 * 会话级 Profile 采样率（SENTRY_PROFILE_SESSION_SAMPLE_RATE）。
 * 在 SDK init 时判定一次；未配置默认 0。
 */
export function getSentryProfileSessionSampleRate(): number {
  return parseSampleRate(trimValue(process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE), 0);
}

/** 任一 Profile 采样率 > 0 则加载 Profiling 集成 */
export function isSentryProfilingEnabled(): boolean {
  return getSentryProfilesSampleRate() > 0 || getSentryProfileSessionSampleRate() > 0;
}

/** 三端 Sentry.init 共用的采样 / Logs / PII 选项（会话 Profile 固定随 span） */
export function getSentrySharedInitOptions(): {
  tracesSampleRate: number;
  profilesSampleRate: number;
  profileSessionSampleRate: number;
  profileLifecycle: 'trace';
  enableLogs: boolean;
  sendDefaultPii: boolean;
} {
  return {
    tracesSampleRate: getSentryTracesSampleRate(),
    profilesSampleRate: getSentryProfilesSampleRate(),
    profileSessionSampleRate: getSentryProfileSessionSampleRate(),
    profileLifecycle: 'trace',
    enableLogs: getSentryEnableLogs(),
    sendDefaultPii: getSentrySendDefaultPii(),
  };
}
