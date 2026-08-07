import {
  getActiveSpan,
  getCurrentScope,
  getRootSpan,
  updateSpanName,
} from '@sentry/core';
import { isSentryEnabled } from '@/lib/observability/sentry/env';

/**
 * 将 Proxy/Middleware Trace 根 span 从默认的 `middleware GET`
 * 改为可读的 `GET /docs/...`（不含 query，控制基数与隐私）。
 *
 * 注意：必须从 `@sentry/core` 取 span API。`@sentry/nextjs` 的 edge 入口
 * 不导出 `updateSpanName`，Turbopack 在 middleware/edge instrumentation 下会静态失败。
 */
export function setProxyTraceName(method: string, pathname: string): void {
  if (!isSentryEnabled()) return;

  const name = `${method} ${pathname || '/'}`;
  try {
    getCurrentScope().setTransactionName(name);
    const active = getActiveSpan();
    const root = active ? getRootSpan(active) : undefined;
    if (root) {
      updateSpanName(root, name);
    }
  } catch {
    /* Sentry 未就绪时忽略 */
  }
}
