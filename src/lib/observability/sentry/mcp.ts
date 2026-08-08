import type { McpAuditEntry } from '@/lib/observability/mcp-audit-log';
import {
  fireSentryAudit,
  flattenParams,
  networkAttrs,
  networkTags,
  strAttr,
} from '@/lib/observability/sentry/emit';
import { attachTraceContext } from '@/lib/observability/sentry/trace-context';
import { resolveAuthMethod } from '@/lib/observability/request-enrichment';
import { getSentryRelease } from '@/lib/observability/sentry/env';

/** 已鉴权后的 MCP 工具调用 */
export function shouldEmitMcpCall(entry: Pick<McpAuditEntry, 'rpcMethod' | 'tool' | 'outcome'>): boolean {
  if (entry.outcome === 'unauthorized') return false;
  return entry.rpcMethod === 'tools/call' && typeof entry.tool === 'string' && entry.tool.length > 0;
}

/** MCP Token / SSO 缺失导致的拒绝（扫描、过期 token、未登录） */
export function shouldEmitMcpDeny(entry: Pick<McpAuditEntry, 'outcome'>): boolean {
  return entry.outcome === 'unauthorized';
}

/**
 * 其它 JSON-RPC（initialize / tools/list / ping …）。
 * tools/call 与 unauthorized 分别由 mcp.call / mcp.deny 覆盖。
 */
export function shouldEmitMcpRpc(entry: Pick<McpAuditEntry, 'rpcMethod' | 'tool' | 'outcome'>): boolean {
  if (entry.outcome === 'unauthorized') return false;
  if (shouldEmitMcpCall(entry)) return false;
  if (entry.rpcMethod === 'empty_body') return false;
  return true;
}

function paramsSummary(params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return '';
  return Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ');
}

function strParam(
  params: Record<string, string | number | boolean> | undefined,
  key: string,
): string | undefined {
  const v = params?.[key];
  if (typeof v === 'string' && v) return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function mcpCallMessage(entry: McpAuditEntry, tool: string): string {
  const detail = paramsSummary(entry.params);
  const via =
    entry.clientFamily && entry.clientFamily !== 'unknown' ? ` via ${entry.clientFamily}` : '';
  const base = `[mcp.call] ${tool}${via}`;
  return detail ? `${base} ${detail} ${entry.status}` : `${base} ${entry.status}`;
}

function mcpDenyMessage(entry: McpAuditEntry): string {
  const tool = entry.tool ? ` ${entry.tool}` : '';
  return `[mcp.deny] ${entry.rpcMethod}${tool} ${entry.outcome} ${entry.status}`;
}

function mcpRpcMessage(entry: McpAuditEntry): string {
  const via =
    entry.clientFamily && entry.clientFamily !== 'unknown' ? ` via ${entry.clientFamily}` : '';
  return `[mcp.rpc] ${entry.rpcMethod}${via} ${entry.status}`;
}

function authMethodOf(entry: McpAuditEntry) {
  return resolveAuthMethod({
    authorization: entry.authorization,
  });
}

function attachMcpTrace(entry: McpAuditEntry): void {
  attachTraceContext({
    accessUser: entry.accessUser,
    accessOrigin: entry.accessOrigin,
    ip: entry.ip,
    userAgent: entry.userAgent,
    status: entry.status,
    category: 'mcp',
    outcome: entry.outcome,
    authMethod: authMethodOf(entry),
    geoCountry: entry.geoCountry,
    geoRegion: entry.geoRegion,
    asn: entry.asn,
    mcpTool: entry.tool,
    mcpRpcMethod: entry.rpcMethod,
    mcpClientFamily: entry.clientFamily,
    mcpClientName: entry.clientName,
    mcpClientVersion: entry.clientVersion,
    mcpParamTag: strParam(entry.params, 'tag'),
    mcpParamScope: strParam(entry.params, 'scope'),
  });
}

function mcpClientTags(entry: McpAuditEntry): Record<string, string> {
  const tags: Record<string, string> = {
    'mcp.rpc_method': entry.rpcMethod,
    'auth.method': authMethodOf(entry),
  };
  if (entry.clientFamily) tags['mcp.client'] = entry.clientFamily;
  if (entry.clientName) tags['mcp.client_name'] = entry.clientName;
  if (entry.clientVersion) tags['mcp.client_version'] = entry.clientVersion;
  if (entry.clientSource) tags['mcp.client_source'] = entry.clientSource;
  const tag = strParam(entry.params, 'tag');
  const scope = strParam(entry.params, 'scope');
  if (tag) tags['mcp.param.tag'] = tag;
  if (scope) tags['mcp.param.scope'] = scope;
  if (entry.geoCountry) tags['geo.country'] = entry.geoCountry;
  if (entry.asn) tags['geo.asn'] = entry.asn;
  const release = getSentryRelease();
  if (release) tags['git.sha'] = release;
  return tags;
}

function mcpBaseAttrs(entry: McpAuditEntry): Record<string, string | number | boolean> {
  const release = getSentryRelease();
  return {
    rpc_method: entry.rpcMethod,
    status: entry.status,
    duration_ms: entry.durationMs,
    outcome: entry.outcome,
    'auth.method': authMethodOf(entry),
    'mcp.client': strAttr(entry.clientFamily),
    'mcp.client_name': strAttr(entry.clientName),
    'mcp.client_version': strAttr(entry.clientVersion),
    'mcp.client_source': strAttr(entry.clientSource),
    'geo.country': strAttr(entry.geoCountry),
    'geo.region': strAttr(entry.geoRegion),
    'geo.asn': strAttr(entry.asn),
    ...(release ? { 'git.sha': release, release } : {}),
    ...flattenParams(entry.params),
    ...networkAttrs(entry),
  };
}

export function fireMcpCall(entry: McpAuditEntry): void {
  if (!shouldEmitMcpCall(entry)) return;
  const tool = entry.tool!;

  fireSentryAudit({
    event: 'mcp.call',
    message: mcpCallMessage(entry, tool),
    level: entry.outcome === 'error' ? 'error' : 'info',
    userId: entry.accessUser,
    tags: {
      ...networkTags(entry),
      ...mcpClientTags(entry),
      'mcp.tool': tool,
      'mcp.outcome': entry.outcome,
    },
    attributes: {
      tool,
      ...mcpBaseAttrs(entry),
    },
  });
}

export function fireMcpDeny(entry: McpAuditEntry): void {
  if (!shouldEmitMcpDeny(entry)) return;

  fireSentryAudit({
    event: 'mcp.deny',
    message: mcpDenyMessage(entry),
    level: 'warn',
    userId: entry.accessUser,
    tags: {
      ...networkTags(entry),
      ...mcpClientTags(entry),
      'mcp.outcome': entry.outcome,
      ...(entry.tool ? { 'mcp.tool': entry.tool } : {}),
    },
    attributes: {
      tool: strAttr(entry.tool),
      ...mcpBaseAttrs(entry),
    },
  });
}

export function fireMcpRpc(entry: McpAuditEntry): void {
  if (!shouldEmitMcpRpc(entry)) return;

  fireSentryAudit({
    event: 'mcp.rpc',
    message: mcpRpcMessage(entry),
    level: entry.outcome === 'error' || entry.outcome === 'invalid' ? 'warn' : 'info',
    userId: entry.accessUser,
    tags: {
      ...networkTags(entry),
      ...mcpClientTags(entry),
      'mcp.outcome': entry.outcome,
    },
    attributes: {
      tool: strAttr(entry.tool),
      ...mcpBaseAttrs(entry),
    },
  });
}

/** MCP 审计入口：挂 Trace 上下文 + call / deny / 其它 rpc Logs */
export function fireMcpAudit(entry: McpAuditEntry): void {
  attachMcpTrace(entry);
  fireMcpCall(entry);
  fireMcpDeny(entry);
  fireMcpRpc(entry);
}
