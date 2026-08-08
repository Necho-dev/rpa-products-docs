/** Sentry 运行时开关与环境（客户端经 next.config `env` 内联同一变量名） */

/**
 * 读取构建期/运行时环境变量。
 *
 * **必须使用 `process.env.SENTRY_DSN` 这类静态属性访问**，
 * 不能 `process.env[key]`：Next/Turbopack 只对字面量 `process.env.X` 内联。
 * 动态 key 会导致浏览器端 DSN 永远为空 → Session Replay / pageload 不上传。
 */
function trimValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

/**
 * 唯一 DSN；未配置则视为关闭 Sentry（含 Errors / Logs / Trace / Replay / 业务审计）。
 * 兼容可选的 `NEXT_PUBLIC_SENTRY_DSN`（同一值时作冗余）。
 */
export function getSentryDsn(): string | undefined {
  return (
    trimValue(process.env.SENTRY_DSN) ?? trimValue(process.env.NEXT_PUBLIC_SENTRY_DSN)
  );
}

/** 默认 `dev`；生产请显式设为 `production` / `staging` 等 */
export function getSentryEnvironment(): string {
  return (
    trimValue(process.env.SENTRY_ENVIRONMENT) ??
    trimValue(process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT) ??
    'dev'
  );
}

/**
 * Sentry release / git sha。
 * 由构建脚本（deplpy）注入 Docker ARG，**不是** `.env` 配置项。
 * 客户端经 next.config `env` 静态内联。
 */
export function getSentryRelease(): string | undefined {
  return (
    trimValue(process.env.SENTRY_RELEASE) ??
    trimValue(process.env.NEXT_PUBLIC_SENTRY_RELEASE) ??
    trimValue(process.env.GIT_SHA) ??
    trimValue(process.env.VERCEL_GIT_COMMIT_SHA)
  );
}

export function isSentryEnabled(): boolean {
  return getSentryDsn() !== undefined;
}
