/** Sentry 运行时开关与环境（客户端经 next.config `env` 内联同一变量名） */

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

/** 唯一 DSN；未配置则视为关闭 Sentry（含 Errors / Logs / Trace / Replay / 业务审计） */
export function getSentryDsn(): string | undefined {
  return trimEnv('SENTRY_DSN');
}

/** 默认 `dev`；生产请显式设为 `production` / `staging` 等 */
export function getSentryEnvironment(): string {
  return trimEnv('SENTRY_ENVIRONMENT') ?? 'dev';
}

export function isSentryEnabled(): boolean {
  return getSentryDsn() !== undefined;
}
