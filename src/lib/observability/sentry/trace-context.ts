import {
  getActiveSpan,
  getCurrentScope,
  getIsolationScope,
  getRootSpan,
} from '@sentry/core';
import { isSentryEnabled, getSentryRelease } from '@/lib/observability/sentry/env';
import { parseUserAgent } from '@/lib/observability/sentry/parse-user-agent';
import type { AuthMethod } from '@/lib/observability/request-enrichment';

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
  authMethod?: AuthMethod;
  /** Next RSC / Flight */
  rsc?: boolean;
  geoCountry?: string;
  geoRegion?: string;
  asn?: string;
  /** MCP 工具名等 */
  mcpTool?: string;
  mcpRpcMethod?: string;
  mcpClientFamily?: string;
  mcpClientName?: string;
  mcpClientVersion?: string;
  mcpParamTag?: string;
  mcpParamScope?: string;
};

/**
 * 写入 Trace（span attributes + scope tags）的上下文字段。
 * 仅非空值；空串不入 span，避免 Explore 出现无意义分桶。
 */
export function buildTraceContextAttributes(
  entry: TraceContextInput,
): Record<string, string | number | boolean> {
  const { browser, os } = parseUserAgent(entry.userAgent);
  const attrs: Record<string, string | number | boolean> = {};

  if (entry.accessOrigin) attrs['cube.origin'] = entry.accessOrigin;
  if (entry.ip) {
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
  if (entry.authMethod) attrs['auth.method'] = entry.authMethod;
  if (entry.rsc != null) {
    attrs['http.rsc'] = entry.rsc;
  }
  if (entry.geoCountry) attrs['geo.country'] = entry.geoCountry;
  if (entry.geoRegion) attrs['geo.region'] = entry.geoRegion;
  if (entry.asn) attrs['geo.asn'] = entry.asn;

  if (entry.mcpTool) attrs['mcp.tool'] = entry.mcpTool;
  if (entry.mcpRpcMethod) attrs['mcp.rpc_method'] = entry.mcpRpcMethod;
  if (entry.mcpClientFamily) attrs['mcp.client'] = entry.mcpClientFamily;
  if (entry.mcpClientName) attrs['mcp.client_name'] = entry.mcpClientName;
  if (entry.mcpClientVersion) attrs['mcp.client_version'] = entry.mcpClientVersion;
  if (entry.mcpParamTag) attrs['mcp.param.tag'] = entry.mcpParamTag;
  if (entry.mcpParamScope) attrs['mcp.param.scope'] = entry.mcpParamScope;

  const release = getSentryRelease();
  if (release) {
    attrs['git.sha'] = release;
    attrs.release = release;
  }

  return attrs;
}

function attrsToStringTags(
  attrs: Record<string, string | number | boolean>,
): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'user_agent') continue;
    tags[key] = String(value);
  }
  return tags;
}

/**
 * 把网络 / 身份上下文挂到当前 Trace 根 span 与 isolation/current scope。
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
        ...(entry.ip ? { ip_address: entry.ip } : {}),
      };
      scope.setUser(user);
      isolation.setUser(user);
    }

    if (Object.keys(tags).length > 0) {
      scope.setTags(tags);
      isolation.setTags(tags);
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
