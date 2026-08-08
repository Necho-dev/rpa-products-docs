/**
 * Sentry 业务审计事件（Logs）。
 *
 * | 事件 | 含义 |
 * |------|------|
 * | docs.view | 真实文档浏览（排除 prefetch） |
 * | mcp.call | MCP 工具调用（已鉴权） |
 * | mcp.deny | MCP Token / 未登录拒绝 |
 * | sso.redirect | SSO 门禁踢去登录（成功拦截） |
 * | sso.deny | SSO 401 |
 * | auth.deny | UA / 嵌入 / OG 等 Proxy 鉴权拒绝 |
 */
export { getSentryDsn, getSentryEnvironment, isSentryEnabled } from '@/lib/observability/sentry/env';
export { parseUserAgent } from '@/lib/observability/sentry/parse-user-agent';
export { shouldEmitDocsView, formatDocsViewMessage, fireDocsView } from '@/lib/observability/sentry/docs';
export {
  shouldEmitMcpCall,
  shouldEmitMcpDeny,
  fireMcpCall,
  fireMcpDeny,
  fireMcpAudit,
} from '@/lib/observability/sentry/mcp';
export {
  shouldEmitAuthDeny,
  shouldEmitSsoGate,
  fireAuthDeny,
  fireSsoGate,
} from '@/lib/observability/sentry/auth';
export {
  setProxyTraceName,
  registerReadableTraceNameHooks,
  resolveReadableTraceName,
  applyReadableTraceName,
  isOpaqueTraceName,
  stripPathQuery,
} from '@/lib/observability/sentry/trace-name';
export {
  attachTraceContext,
  buildTraceContextAttributes,
} from '@/lib/observability/sentry/trace-context';

import type { AccessLogEntry } from '@/lib/observability/access-log';
import { fireAuthDeny } from '@/lib/observability/sentry/auth';
import { fireDocsView } from '@/lib/observability/sentry/docs';
import { attachTraceContext } from '@/lib/observability/sentry/trace-context';

/** Access 审计：把上下文挂到 Trace + docs.view / auth.deny Logs */
export function fireAccessAudit(entry: AccessLogEntry): void {
  attachTraceContext({
    accessUser: entry.accessUser,
    accessOrigin: entry.accessOrigin,
    ip: entry.ip,
    userAgent: entry.userAgent,
    status: entry.status,
    category: entry.category,
    outcome: entry.outcome,
  });
  fireDocsView(entry);
  fireAuthDeny(entry);
}
