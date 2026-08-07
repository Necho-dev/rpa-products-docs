import type { NextRequest, NextResponse } from 'next/server';
import {
  clientIp,
  isObservabilityLogEnabled,
  pathCategory,
  sanitizeQuery,
  shouldLogAccessRequest,
} from '@/lib/observability/access-log';
import { isNextPrefetchRequest, recordPrefetchAccess } from '@/lib/observability/prefetch-access-log';
import { appendObservabilityLogFile, isObservabilityLogFileEnabled } from '@/lib/observability/access-log-file';
import {
  formatAccessLogTime,
  formatHttpMethod,
  formatLogMetaGroup,
  formatLogMetaLabel,
  formatObservabilityChannelTag,
  formatObservabilityStatus,
  formatObservabilityStdoutIdentityGroup,
  formatSubduedLogMeta,
  joinObservabilityStdoutSections,
  shouldUseStdoutColors,
} from '@/lib/observability/access-log-stdout';
import {
  mergeObservabilityAuth,
  resolveObservabilityLogAuth,
  toObservabilityJsonlEntry,
  type ObservabilityAuthFields,
} from '@/lib/observability/observability-auth';
import { fireSsoGate, isSentryEnabled } from '@/lib/observability/sentry';

export type SsoLogOutcome = 'redirect' | 'unauthorized' | 'pass';

export type SsoLogEntry = {
  timestamp: number;
  time: string;
  type: 'sso';
  method: string;
  path: string;
  query?: string;
  status: number;
  outcome: SsoLogOutcome;
  category: string;
  durationMs: number;
  redirectTo?: string;
  ip?: string;
  userAgent?: string;
} & ObservabilityAuthFields;

export function isSsoAuditLogEnabled(): boolean {
  return isObservabilityLogEnabled();
}

export function ssoOutcomeFromStatus(status: number): SsoLogOutcome {
  if (status === 401) return 'unauthorized';
  if (status === 302 || status === 307) return 'redirect';
  return 'pass';
}

function normalizeUserAgent(ua: string | null): string | undefined {
  if (!ua) return undefined;
  const trimmed = ua.trim();
  return trimmed === '' ? undefined : trimmed;
}

function redirectTarget(response: NextResponse): string | undefined {
  const loc = response.headers.get('location');
  if (!loc) return undefined;
  try {
    const url = new URL(loc, 'http://localhost');
    const target = `${url.pathname}${url.search}`;
    return target.length > 240 ? `${target.slice(0, 240)}…` : target;
  } catch {
    return loc.length > 240 ? `${loc.slice(0, 240)}…` : loc;
  }
}

function formatPathWithQuery(entry: SsoLogEntry): string {
  return entry.query ? `${entry.path}?${entry.query}` : entry.path;
}

export function buildSsoLogEntry(
  request: NextRequest,
  response: NextResponse,
  outcome: SsoLogOutcome,
  startedMs: number,
): SsoLogEntry {
  const { pathname, search } = request.nextUrl;
  const now = Date.now();
  const entry: SsoLogEntry = mergeObservabilityAuth(
    {
      timestamp: now,
      time: new Date(now).toISOString(),
      type: 'sso',
      method: request.method,
      path: pathname,
      query: sanitizeQuery(search),
      status: response.status,
      outcome,
      category: pathCategory(pathname),
      durationMs: Math.max(0, now - startedMs),
      ip: clientIp(request),
      userAgent: normalizeUserAgent(request.headers.get('user-agent')),
    },
    resolveObservabilityLogAuth(request),
  );
  if (outcome === 'redirect') {
    entry.redirectTo = redirectTarget(response);
  }
  return entry;
}

function statusColor(status: number, useColors: boolean): string {
  return formatObservabilityStatus(status, useColors);
}

function outcomeLabel(outcome: SsoLogOutcome, useColors: boolean): string {
  const RESET = '\x1b[0m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';
  const GREEN = '\x1b[32m';
  const YELLOW = '\x1b[33m';
  const RED = '\x1b[31m';
  if (!useColors) return outcome;
  switch (outcome) {
    case 'unauthorized':
      return `${RED}${BOLD}${outcome}${RESET}`;
    case 'redirect':
      return `${YELLOW}${BOLD}${outcome}${RESET}`;
    case 'pass':
      return `${DIM}${GREEN}${outcome}${RESET}`;
    default:
      return outcome;
  }
}

export function formatSsoLogPretty(entry: SsoLogEntry, options?: { useColors?: boolean }): string {
  const useColors = options?.useColors ?? false;
  const RESET = '\x1b[0m';
  const DIM = '\x1b[2m';
  const GRAY = '\x1b[90m';

  const time = formatAccessLogTime(entry.time);
  const timeLabel = useColors ? `${GRAY}${time}${RESET}` : time;
  const channel = formatObservabilityChannelTag('sso', useColors);
  const path = formatPathWithQuery(entry);
  const method = formatHttpMethod(entry.method, useColors);
  const status = statusColor(entry.status, useColors);
  const duration = useColors ? `${DIM}${entry.durationMs}ms${RESET}` : `${entry.durationMs}ms`;

  const metaParts: string[] = [outcomeLabel(entry.outcome, useColors), formatLogMetaLabel(entry.category, useColors)];
  if (entry.redirectTo) metaParts.push(formatLogMetaLabel(`→ ${entry.redirectTo}`, useColors));

  const networkParts: string[] = [];
  if (entry.ip) networkParts.push(formatSubduedLogMeta(entry.ip, useColors));
  if (entry.userAgent) networkParts.push(formatSubduedLogMeta(entry.userAgent, useColors));

  const tail = joinObservabilityStdoutSections([
    formatLogMetaGroup(metaParts, useColors),
    formatObservabilityStdoutIdentityGroup(entry, useColors),
    networkParts.length > 0 ? formatLogMetaGroup(networkParts, useColors) : undefined,
  ]);

  return `${timeLabel} ${channel} ${method} ${path} ${status} in ${duration} ${tail}`;
}

/** stdout / jsonl（不含 Sentry） */
export function writeSsoLog(entry: SsoLogEntry): void {
  const useColors = shouldUseStdoutColors();
  console.log(formatSsoLogPretty(entry, { useColors }));
  if (isObservabilityLogFileEnabled()) {
    appendObservabilityLogFile(toObservabilityJsonlEntry(entry));
  }
}

export function logSsoGate(
  request: NextRequest,
  response: NextResponse,
  outcome: SsoLogOutcome,
  startedMs: number,
): void {
  if (!isSsoAuditLogEnabled() || !shouldLogAccessRequest(request)) return;
  writeSsoLog(buildSsoLogEntry(request, response, outcome, startedMs));
}

/**
 * 本地 SSO 审计与 Sentry 解耦：prefetch 不上报；
 * SENTRY_DSN 存在时即使本地可观测关闭也会发 sso.redirect / sso.deny。
 */
export function finishSsoLog(
  request: NextRequest,
  response: NextResponse,
  outcome: SsoLogOutcome,
  startedMs: number,
): NextResponse {
  if (isNextPrefetchRequest(request)) {
    if (shouldLogAccessRequest(request)) {
      recordPrefetchAccess(request, response, startedMs);
    }
    return response;
  }

  const localOn = isSsoAuditLogEnabled() && shouldLogAccessRequest(request);
  const sentryOn = isSentryEnabled();
  if (!localOn && !sentryOn) return response;

  const entry = buildSsoLogEntry(request, response, outcome, startedMs);
  if (localOn) writeSsoLog(entry);
  if (sentryOn) fireSsoGate(entry);
  return response;
}
