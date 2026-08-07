import * as Sentry from '@sentry/nextjs';
import { isSentryEnabled } from '@/lib/observability/sentry/env';

/**
 * 将 Proxy/Middleware Trace 根 span 从默认的 `middleware GET`
 * 改为可读的 `GET /docs/...`（不含 query，控制基数与隐私）。
 */
export function setProxyTraceName(method: string, pathname: string): void {
  if (!isSentryEnabled()) return;

  const name = `${method} ${pathname || '/'}`;
  try {
    Sentry.getCurrentScope().setTransactionName(name);
    const active = Sentry.getActiveSpan();
    const root = active ? Sentry.getRootSpan(active) : undefined;
    if (root) {
      Sentry.updateSpanName(root, name);
    }
  } catch {
    /* Sentry 未就绪时忽略 */
  }
}
