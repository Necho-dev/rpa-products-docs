import { isObservabilityLogEnabled, normalizeClientIp } from '@/lib/observability/access-log';
import { appendObservabilityLogFile, isObservabilityLogFileEnabled } from '@/lib/observability/access-log-file';
import {
  formatAccessLogTime,
  formatLogMetaGroup,
  formatLogMetaLabel,
  formatMcpMethodLabel,
  formatObservabilityChannelTag,
  formatObservabilityStatus,
  formatObservabilityStdoutIdentityGroup,
  formatSubduedLogMeta,
  joinObservabilityStdoutSections,
  shouldUseStdoutColors,
} from '@/lib/observability/access-log-stdout';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  mergeObservabilityAuth,
  resolveObservabilityLogAuth,
  toObservabilityJsonlEntry,
  type ObservabilityAuthFields,
} from '@/lib/observability/observability-auth';
import { fireMcpAudit, isSentryEnabled } from '@/lib/observability/sentry';

export type McpAuditOutcome = 'ok' | 'error' | 'unauthorized' | 'invalid';

export type McpRpcMeta = {
  rpcMethod: string;
  rpcId?: string | number | null;
  tool?: string;
  params?: Record<string, string | number | boolean>;
  clientName?: string;
  clientVersion?: string;
};

export type McpAuditEntry = {
  timestamp: number;
  time: string;
  type: 'mcp';
  rpcMethod: string;
  rpcId?: string | number | null;
  tool?: string;
  params?: Record<string, string | number | boolean>;
  clientName?: string;
  clientVersion?: string;
  status: number;
  outcome: McpAuditOutcome;
  durationMs: number;
  ip?: string;
  userAgent?: string;
} & ObservabilityAuthFields;

const TOOL_ARG_KEYS = new Set([
  'path',
  'query',
  'locale',
  'limit',
  'tag',
]);

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

export function isMcpAuditLogEnabled(): boolean {
  const explicit = trimEnv('DOCS_MCP_AUDIT_LOG_ENABLED');
  if (explicit !== undefined) {
    return explicit === '1' || explicit.toLowerCase() === 'true' || explicit.toLowerCase() === 'yes';
  }
  return isObservabilityLogEnabled();
}

function normalizeUserAgent(ua: string | null): string | undefined {
  if (!ua) return undefined;
  const trimmed = ua.trim();
  return trimmed === '' ? undefined : trimmed;
}

function sanitizeToolArgs(raw: unknown): Record<string, string | number | boolean> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!TOOL_ARG_KEYS.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function metaFromMessage(msg: unknown): McpRpcMeta | null {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
  const record = msg as Record<string, unknown>;
  const rpcMethod = typeof record.method === 'string' ? record.method : 'unknown';
  const rpcId =
    record.id === null || typeof record.id === 'string' || typeof record.id === 'number'
      ? record.id
      : undefined;

  if (rpcMethod === 'tools/call') {
    const params = record.params as Record<string, unknown> | undefined;
    const tool = typeof params?.name === 'string' ? params.name : undefined;
    return {
      rpcMethod,
      rpcId,
      tool,
      params: sanitizeToolArgs(params?.arguments),
    };
  }

  if (rpcMethod === 'initialize') {
    const initParams = record.params as Record<string, unknown> | undefined;
    const clientInfo =
      initParams?.clientInfo && typeof initParams.clientInfo === 'object'
        ? (initParams.clientInfo as Record<string, unknown>)
        : undefined;
    return {
      rpcMethod,
      rpcId,
      clientName: typeof clientInfo?.name === 'string' ? clientInfo.name : undefined,
      clientVersion: typeof clientInfo?.version === 'string' ? clientInfo.version : undefined,
    };
  }

  return { rpcMethod, rpcId };
}

/** 解析 MCP POST 请求体（支持 JSON-RPC batch） */
export function extractMcpRpcMeta(body: string): McpRpcMeta[] {
  if (!body.trim()) return [{ rpcMethod: 'empty_body' }];
  try {
    const json: unknown = JSON.parse(body);
    const messages = Array.isArray(json) ? json : [json];
    const metas = messages.map(metaFromMessage).filter((m): m is McpRpcMeta => m !== null);
    return metas.length > 0 ? metas : [{ rpcMethod: 'unknown' }];
  } catch {
    return [{ rpcMethod: 'invalid_json' }];
  }
}

export function mcpAuditOutcome(status: number, rpcMethod: string): McpAuditOutcome {
  if (status === 401 || status === 403) return 'unauthorized';
  if (rpcMethod === 'invalid_json' || rpcMethod === 'empty_body') return 'invalid';
  if (status >= 400) return 'error';
  return 'ok';
}

function requestIp(request: Request): string | undefined {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return normalizeClientIp(realIp);
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return undefined;
  const first = forwarded.split(',')[0]?.trim();
  return normalizeClientIp(first || undefined);
}

export function buildMcpAuditEntry(
  meta: McpRpcMeta,
  request: Request,
  access: DocAccessContext,
  status: number,
  startedMs: number,
): McpAuditEntry {
  const now = Date.now();
  return mergeObservabilityAuth(
    {
      timestamp: now,
      time: new Date(now).toISOString(),
      type: 'mcp',
      rpcMethod: meta.rpcMethod,
      rpcId: meta.rpcId,
      tool: meta.tool,
      params: meta.params,
      clientName: meta.clientName,
      clientVersion: meta.clientVersion,
      status,
      outcome: mcpAuditOutcome(status, meta.rpcMethod),
      durationMs: Math.max(0, now - startedMs),
      ip: requestIp(request),
      userAgent: normalizeUserAgent(request.headers.get('user-agent')),
    },
    resolveObservabilityLogAuth(request),
  );
}

function formatParamsSummary(params?: Record<string, string | number | boolean>): string | undefined {
  if (!params) return undefined;
  return Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(', ');
}

export function formatMcpAuditPretty(entry: McpAuditEntry, options?: { useColors?: boolean }): string {
  const useColors = options?.useColors ?? false;
  const RESET = '\x1b[0m';
  const DIM = '\x1b[2m';
  const GRAY = '\x1b[90m';

  const time = formatAccessLogTime(entry.time);
  const timeLabel = useColors ? `${GRAY}${time}${RESET}` : time;
  const channel = formatObservabilityChannelTag('mcp', useColors);
  const methodLabel = formatMcpMethodLabel(entry.rpcMethod, entry.tool, useColors);
  const status = formatObservabilityStatus(entry.status, useColors);
  const duration = useColors ? `${DIM}${entry.durationMs}ms${RESET}` : `${entry.durationMs}ms`;

  const metaParts: string[] = [formatLogMetaLabel(entry.outcome, useColors)];
  const paramsSummary = formatParamsSummary(entry.params);
  if (paramsSummary) metaParts.push(formatLogMetaLabel(paramsSummary, useColors));
  if (entry.clientName) {
    metaParts.push(
      formatLogMetaLabel(
        entry.clientVersion ? `${entry.clientName}@${entry.clientVersion}` : entry.clientName,
        useColors,
      ),
    );
  }

  const networkParts: string[] = [];
  if (entry.ip) networkParts.push(formatSubduedLogMeta(entry.ip, useColors));
  if (entry.userAgent) networkParts.push(formatSubduedLogMeta(entry.userAgent, useColors));

  const tail = joinObservabilityStdoutSections([
    formatLogMetaGroup(metaParts, useColors),
    formatObservabilityStdoutIdentityGroup(entry, useColors),
    networkParts.length > 0 ? formatLogMetaGroup(networkParts, useColors) : undefined,
  ]);

  return `${timeLabel} ${channel} ${methodLabel} ${status} in ${duration} ${tail}`;
}

/** stdout / jsonl（不含 Sentry） */
export function writeMcpAuditLog(entry: McpAuditEntry): void {
  const useColors = shouldUseStdoutColors();
  console.log(formatMcpAuditPretty(entry, { useColors }));
  if (isObservabilityLogFileEnabled()) {
    appendObservabilityLogFile(toObservabilityJsonlEntry(entry));
  }
}

export function logMcpAuditEntries(
  metas: McpRpcMeta[],
  request: Request,
  access: DocAccessContext,
  status: number,
  startedMs: number,
): void {
  const localOn = isMcpAuditLogEnabled();
  const sentryOn = isSentryEnabled();
  if (!localOn && !sentryOn) return;

  const list: McpRpcMeta[] = metas.length > 0 ? metas : [{ rpcMethod: 'unknown' }];
  for (const meta of list) {
    const entry = buildMcpAuditEntry(meta, request, access, status, startedMs);
    if (localOn) writeMcpAuditLog(entry);
    if (sentryOn) fireMcpAudit(entry);
  }
}

// re-export for tests
