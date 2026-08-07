import type { McpAuditEntry } from '@/lib/observability/mcp-audit-log';
import {
  fireSentryAudit,
  flattenParams,
  networkAttrs,
  networkTags,
  strAttr,
} from '@/lib/observability/sentry/emit';

/** 已鉴权后的 MCP 工具调用 */
export function shouldEmitMcpCall(entry: Pick<McpAuditEntry, 'rpcMethod' | 'tool' | 'outcome'>): boolean {
  if (entry.outcome === 'unauthorized') return false;
  return entry.rpcMethod === 'tools/call' && typeof entry.tool === 'string' && entry.tool.length > 0;
}

/** MCP Token / SSO 缺失导致的拒绝（扫描、过期 token、未登录） */
export function shouldEmitMcpDeny(entry: Pick<McpAuditEntry, 'outcome'>): boolean {
  return entry.outcome === 'unauthorized';
}

function paramsSummary(params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return '';
  return Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ');
}

function mcpCallMessage(entry: McpAuditEntry, tool: string): string {
  const detail = paramsSummary(entry.params);
  const base = `[mcp.call] ${tool}`;
  return detail ? `${base} ${detail} ${entry.status}` : `${base} ${entry.status}`;
}

function mcpDenyMessage(entry: McpAuditEntry): string {
  const tool = entry.tool ? ` ${entry.tool}` : '';
  return `[mcp.deny] ${entry.rpcMethod}${tool} ${entry.outcome} ${entry.status}`;
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
      'mcp.tool': tool,
      'mcp.outcome': entry.outcome,
    },
    attributes: {
      tool,
      rpc_method: entry.rpcMethod,
      status: entry.status,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
      'mcp.client': strAttr(entry.clientName),
      'mcp.client_version': strAttr(entry.clientVersion),
      ...flattenParams(entry.params),
      ...networkAttrs(entry),
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
      'mcp.outcome': entry.outcome,
      ...(entry.tool ? { 'mcp.tool': entry.tool } : {}),
    },
    attributes: {
      tool: strAttr(entry.tool),
      rpc_method: entry.rpcMethod,
      status: entry.status,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
      'mcp.client': strAttr(entry.clientName),
      'mcp.client_version': strAttr(entry.clientVersion),
      ...flattenParams(entry.params),
      ...networkAttrs(entry),
    },
  });
}

/** MCP 审计入口：成功 call 或鉴权拒绝 */
export function fireMcpAudit(entry: McpAuditEntry): void {
  fireMcpCall(entry);
  fireMcpDeny(entry);
}
