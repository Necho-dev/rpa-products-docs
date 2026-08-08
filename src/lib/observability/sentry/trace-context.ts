import {
  getActiveSpan,
  getCurrentScope,
  getIsolationScope,
  getRootSpan,
} from '@sentry/core';
import { isSentryEnabled } from '@/lib/observability/sentry/env';
import { parseUserAgent } from '@/lib/observability/sentry/parse-user-agent';

export type TraceContextInput = {
  accessUser?: string;
  accessOrigin?: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  /** 业务路径类别：docs / mcp / api … */
  category?: string;
  /** access / sso / mcp outcome */
  outcome?: string;
  /** MCP 工具名等 */
  mcpTool?: string;
  mcpClientFamily?: string;
  mcpClientName?: string;
  mcpClientVersion?: string;
};

/**
 * 写入 Trace（span attributes + scope tags）的上下文字段。
 * 仅非空值；空串不入 span，避免 Explore 出现无意义分桶。
 *
 * 说明：原先只在 Sentry Logs 的 attributes 里带 cube.origin / client.ip，
 * Traces Explore 的 Group By 读的是 **span attributes / tags**，故必须写入 span。
 */
export function buildTraceContextAttributes(
  entry: TraceContextInput,
): Record<string, string | number | boolean> {
  const { browser, os } = parseUserAgent(entry.userAgent);
  const attrs: Record<string, string | number | boolean> = {};

  if (entry.accessOrigin) attrs['cube.origin'] = entry.accessOrigin;
  if (entry.ip) {
    // 与日志一致的业务字段 + OTEL 常用别名（Explore 常用 client.address）
    attrs['client.ip'] = entry.ip;
    attrs['client.address'] = entry.ip;
  }
  if (entry.accessUser) attrs['user.id'] = entry.accessUser;
  if (browser) attrs['browser.name'] = browser;
  if (os) attrs['os.name'] = os;
  if (entry.userAgent) attrs['user_agent'] = entry.userAgent;
  if (entry.status != null) attrs['http.status_code'] = entry.status;
  if (entry.category) attrs['knowledge.category'] = entry.category;
  if (entry.outcome) attrs['knowledge.outcome'] = entry.outcome;
  if (entry.mcpTool) attrs['mcp.tool'] = entry.mcpTool;
  if (entry.mcpClientFamily) attrs['mcp.client'] = entry.mcpClientFamily;
  if (entry.mcpClientName) attrs['mcp.client_name'] = entry.mcpClientName;
  if (entry.mcpClientVersion) attrs['mcp.client_version'] = entry.mcpClientVersion;

  return attrs;
}

function attrsToStringTags(
  attrs: Record<string, string | number | boolean>,
): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    // user_agent 过长不适合做 tag（基数 + 长度限制）
    if (key === 'user_agent') continue;
    tags[key] = String(value);
  }
  return tags;
}

/**
 * 把网络 / 身份上下文挂到当前 Trace 根 span 与 isolation/current scope。
 * Proxy / Node route / MCP 任意运行时均可调用；无 active span 时至少写 scope tags。
 */
export function attachTraceContext(entry: TraceContextInput): void {
  if (!isSentryEnabled()) return;

  try {
    const attrs = buildTraceContextAttributes(entry);
    if (Object.keys(attrs).length === 0) return;

    const tags = attrsToStringTags(attrs);
    const scope = getCurrentScope();
    const isolation = getIsolationScope();

    if (entry.accessUser || entry.ip) {
      const user = {
        ...(entry.accessUser ? { id: entry.accessUser } : {}),
        // 自定义 client.ip 已写 span；user.ip_address 便于 Issue/用户侧展示
        ...(entry.ip ? { ip_address: entry.ip } : {}),
      };
      scope.setUser(user);
      isolation.setUser(user);
    }

    if (Object.keys(tags).length > 0) {
      scope.setTags(tags);
      isolation.setTags(tags);
      // 作为 scope attributes，streamed segment 也会拷贝一部分
      scope.setAttributes(attrs);
      isolation.setAttributes(attrs);
    }

    const active = getActiveSpan();
    const root = active ? getRootSpan(active) : undefined;
    if (root) {
      root.setAttributes(attrs);
    }
    if (active && active !== root) {
      active.setAttributes(attrs);
    }
  } catch {
    /* Sentry 未就绪时忽略 */
  }
}
