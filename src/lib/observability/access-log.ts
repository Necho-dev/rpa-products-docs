import type { NextRequest, NextResponse } from 'next/server';
import { appendObservabilityLogFile, isObservabilityLogFileEnabled } from '@/lib/observability/access-log-file';
import { isNextPrefetchRequest, recordPrefetchAccess } from '@/lib/observability/prefetch-access-log';
import { formatAccessLogStdout } from '@/lib/observability/access-log-stdout';
import {
  mergeObservabilityAuth,
  resolveObservabilityLogAuth,
  toObservabilityJsonlEntry,
  type ObservabilityAuthFields,
} from '@/lib/observability/observability-auth';
import { fireAccessAudit, isSentryEnabled } from '@/lib/observability/sentry';

export type { ObservabilityAuthFields, ObservabilityAuthorization } from '@/lib/observability/observability-auth';

export type AccessLogEntry = {
  /** Unix 纪元毫秒(UTC), 以便于排序与日志平台聚合 */
  timestamp: number;
  /** ISO 8601(UTC), 以便于人工检索阅读 */
  time: string;
  type: 'access';
  method: string;
  path: string;
  query?: string;
  status: number;
  outcome: AccessLogOutcome;
  category: string;
  /** Proxy 层处理耗时（毫秒） */
  durationMs: number;
  /** outcome=prefetch 时：本批次预取 URL 数量 */
  prefetchCount?: number;
  /** outcome=prefetch 时：采样路径（最多 5 条） */
  prefetchSample?: string[];
  ip?: string;
  userAgent?: string;
} & ObservabilityAuthFields;

export type AccessLogOutcome =
  | 'forward'
  | 'rewrite'
  | 'embed_ok'
  | 'embed_denied'
  | 'embed_block'
  | 'ua_denied'
  | 'og_denied'
  | 'prefetch';

const SKIP_PATHS = new Set(['/health']);
const SKIP_PREFIXES = ['/_next/'];
const REDACT_QUERY_KEYS = new Set(['sg', 'sh', 'token', 'code', 'state', 'password', 'secret']);

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

/** 生产默认开启；开发默认关闭（避免 HMR 刷屏） */
export function isObservabilityLogEnabled(): boolean {
  const raw =
    trimEnv('DOCS_OBSERVABILITY_LOG_ENABLED') ?? trimEnv('DOCS_ACCESS_LOG_ENABLED');
  if (raw === undefined) return process.env.NODE_ENV === 'production';
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

/** @deprecated 使用 isObservabilityLogEnabled */
export const isAccessLogEnabled = isObservabilityLogEnabled;

export function shouldLogAccessRequest(request: NextRequest): boolean {
  if (!isObservabilityLogEnabled()) return false;
  const { pathname } = request.nextUrl;
  if (SKIP_PATHS.has(pathname)) return false;
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return true;
}

export function pathCategory(pathname: string): string {
  if (pathname.startsWith('/api/')) return 'api';
  if (pathname.startsWith('/auth/')) return 'auth';
  if (pathname === '/mcp' || pathname.startsWith('/mcp/')) return 'mcp';
  if (pathname.startsWith('/oauth/')) return 'oauth';
  if (pathname.startsWith('/og/docs/')) return 'og';
  if (pathname.startsWith('/resources/images/')) return 'resource';
  if (pathname.startsWith('/llms')) return 'export';
  if (pathname.startsWith('/docs')) return 'docs';
  if (pathname.startsWith('/embed/')) return 'embed';
  return 'other';
}

/** IPv6 本机回环 ::1 及 IPv4-mapped 地址归一化，便于日志阅读 */
export function normalizeClientIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const trimmed = ip.trim();
  if (!trimmed) return undefined;
  if (trimmed === '::1') return '127.0.0.1';
  if (trimmed.startsWith('::ffff:')) {
    const v4 = trimmed.slice('::ffff:'.length);
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(v4)) return v4;
  }
  return trimmed;
}

export function clientIp(request: NextRequest): string | undefined {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return normalizeClientIp(realIp);
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return undefined;
  const first = forwarded.split(',')[0]?.trim();
  return normalizeClientIp(first || undefined);
}

export function sanitizeQuery(search: string): string | undefined {
  if (!search) return undefined;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const parts: string[] = [];
  for (const key of params.keys()) {
    const redacted = REDACT_QUERY_KEYS.has(key.toLowerCase());
    for (const value of params.getAll(key)) {
      parts.push(
        redacted
          ? `${encodeURIComponent(key)}=[redacted]`
          : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      );
    }
  }
  const serialized = parts.join('&');
  if (!serialized) return undefined;
  return serialized.length > 240 ? `${serialized.slice(0, 240)}…` : serialized;
}

function normalizeUserAgent(ua: string | null): string | undefined {
  if (!ua) return undefined;
  const trimmed = ua.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function buildAccessLogEntry(
  request: NextRequest,
  response: NextResponse,
  outcome: AccessLogOutcome,
  startedMs: number,
): AccessLogEntry {
  const { pathname, search } = request.nextUrl;
  const now = Date.now();
  return mergeObservabilityAuth(
    {
      timestamp: now,
      time: new Date(now).toISOString(),
      type: 'access',
      method: request.method,
      path: pathname,
      query: sanitizeQuery(search),
      status: response.status,
      outcome,
      category: pathCategory(pathname),
      durationMs: Math.max(0, Date.now() - startedMs),
      ip: clientIp(request),
      userAgent: normalizeUserAgent(request.headers.get('user-agent')),
    },
    resolveObservabilityLogAuth(request),
  );
}

/** stdout 统一 pretty 可读行（TTY 彩色）；jsonl 落盘始终 JSON（不含 Sentry） */
export function writeAccessLog(entry: AccessLogEntry): void {
  console.log(formatAccessLogStdout(entry));
  if (isObservabilityLogFileEnabled()) {
    appendObservabilityLogFile(toObservabilityJsonlEntry(entry));
  }
}

export function logAccessRequest(
  request: NextRequest,
  response: NextResponse,
  outcome: AccessLogOutcome,
  startedMs: number,
): void {
  if (!shouldLogAccessRequest(request)) return;
  writeAccessLog(buildAccessLogEntry(request, response, outcome, startedMs));
}

/**
 * 本地可观测与 Sentry 审计解耦：
 * - prefetch：仅本地汇总，不上报 Sentry docs.view
 * - 其余：本地开关开则写 stdout/jsonl；SENTRY_DSN 存在则走 fireAccessAudit
 */
export function finishAccessLog(
  request: NextRequest,
  response: NextResponse,
  outcome: AccessLogOutcome,
  startedMs: number,
): NextResponse {
  if (isNextPrefetchRequest(request)) {
    if (shouldLogAccessRequest(request)) {
      recordPrefetchAccess(request, response, startedMs);
    }
    return response;
  }

  const localOn = shouldLogAccessRequest(request);
  const sentryOn = isSentryEnabled();
  if (!localOn && !sentryOn) return response;

  const entry = buildAccessLogEntry(request, response, outcome, startedMs);
  if (localOn) writeAccessLog(entry);
  if (sentryOn) fireAccessAudit(entry);
  return response;
}
