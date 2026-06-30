import type { NextRequest, NextResponse } from 'next/server';
import type { AccessLogEntry } from '@/lib/observability/access-log';
import {
  clientIp,
  pathCategory,
  sanitizeQuery,
  shouldLogAccessRequest,
} from '@/lib/observability/access-log';
import { appendObservabilityLogFile, isObservabilityLogFileEnabled } from '@/lib/observability/access-log-file';
import { formatAccessLogStdout } from '@/lib/observability/access-log-stdout';
import {
  mergeObservabilityAuth,
  resolveObservabilityLogAuth,
  toObservabilityJsonlEntry,
  type ObservabilityAuthFields,
} from '@/lib/observability/observability-auth';

const PREFETCH_FLUSH_MS = 400;
const PREFETCH_SAMPLE_MAX = 5;

type PrefetchBatch = {
  triggerPath: string;
  startedMs: number;
  lastEventMs: number;
  count: number;
  samples: string[];
  sampleSet: Set<string>;
  categories: Map<string, number>;
  status: number;
  ip?: string;
  userAgent?: string;
  accessUser?: string;
  accessOrigin?: string;
  authorization?: ObservabilityAuthFields['authorization'];
  timer: ReturnType<typeof setTimeout>;
};

const batches = new Map<string, PrefetchBatch>();

/** Next.js App Router / 浏览器 prefetch 请求识别 */
export function isNextPrefetchRequest(request: NextRequest): boolean {
  const purpose = request.headers.get('purpose') ?? request.headers.get('sec-purpose');
  if (purpose?.toLowerCase() === 'prefetch') return true;
  if (request.headers.get('next-router-prefetch') === '1') return true;
  if (request.headers.get('next-router-segment-prefetch') === '1') return true;
  return false;
}

function batchUserKey(auth: ObservabilityAuthFields): string {
  return auth.accessUser ?? '-';
}

function normalizeUserAgent(ua: string | null): string | undefined {
  if (!ua) return undefined;
  const trimmed = ua.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** 预取通常由当前页触发；优先 next-url，其次 Referer */
export function prefetchTriggerPath(request: NextRequest): string {
  const nextUrl = request.headers.get('next-url')?.trim();
  if (nextUrl) {
    try {
      return new URL(nextUrl, request.url).pathname;
    } catch {
      return nextUrl.split('?')[0] ?? nextUrl;
    }
  }
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).pathname;
    } catch {
      // ignore
    }
  }
  return '-';
}

function batchKey(request: NextRequest): string {
  const ip = clientIp(request) ?? '-';
  const auth = resolveObservabilityLogAuth(request);
  const user = batchUserKey(auth);
  return `${ip}|${user}|${prefetchTriggerPath(request)}`;
}

function dominantCategory(categories: Map<string, number>): string {
  let best = 'other';
  let max = 0;
  for (const [cat, n] of categories) {
    if (n > max) {
      max = n;
      best = cat;
    }
  }
  return best;
}

function buildPrefetchSummaryEntry(batch: PrefetchBatch): AccessLogEntry {
  const now = Date.now();
  return mergeObservabilityAuth(
    {
      timestamp: now,
      time: new Date(now).toISOString(),
      type: 'access',
      method: 'GET',
      path: batch.triggerPath,
      status: batch.status,
      outcome: 'prefetch',
      category: dominantCategory(batch.categories),
      durationMs: Math.max(0, batch.lastEventMs - batch.startedMs),
      prefetchCount: batch.count,
      prefetchSample: batch.samples.length > 0 ? batch.samples : undefined,
      ip: batch.ip,
      userAgent: batch.userAgent,
    },
    {
      ...(batch.accessUser ? { accessUser: batch.accessUser } : {}),
      ...(batch.accessOrigin ? { accessOrigin: batch.accessOrigin } : {}),
      ...(batch.authorization ? { authorization: batch.authorization } : {}),
    },
  );
}

function emitPrefetchSummary(entry: AccessLogEntry): void {
  console.log(formatAccessLogStdout(entry));
  if (isObservabilityLogFileEnabled()) {
    appendObservabilityLogFile(toObservabilityJsonlEntry(entry));
  }
}

function flushBatch(key: string): void {
  const batch = batches.get(key);
  if (!batch) return;
  clearTimeout(batch.timer);
  batches.delete(key);
  emitPrefetchSummary(buildPrefetchSummaryEntry(batch));
}

/** 单条 prefetch 并入批次；静默期结束后写一条汇总日志 */
export function recordPrefetchAccess(
  request: NextRequest,
  response: NextResponse,
  startedMs: number,
): void {
  if (!shouldLogAccessRequest(request)) return;

  const key = batchKey(request);
  const { pathname, search } = request.nextUrl;
  const pathWithQuery = search ? `${pathname}?${sanitizeQuery(search) ?? search}` : pathname;
  const category = pathCategory(pathname);
  const triggerPath = prefetchTriggerPath(request);
  const auth = resolveObservabilityLogAuth(request);

  let batch = batches.get(key);
  if (!batch) {
    batch = {
      triggerPath,
      startedMs,
      lastEventMs: startedMs,
      count: 0,
      samples: [],
      sampleSet: new Set(),
      categories: new Map(),
      status: response.status,
      ip: clientIp(request),
      accessUser: auth.accessUser,
      accessOrigin: auth.accessOrigin,
      authorization: auth.authorization,
      userAgent: normalizeUserAgent(request.headers.get('user-agent')),
      timer: setTimeout(() => flushBatch(key), PREFETCH_FLUSH_MS),
    };
    batches.set(key, batch);
  }

  batch.count += 1;
  batch.lastEventMs = Date.now();
  batch.status = response.status;
  batch.categories.set(category, (batch.categories.get(category) ?? 0) + 1);

  if (!batch.sampleSet.has(pathname) && batch.samples.length < PREFETCH_SAMPLE_MAX) {
    batch.sampleSet.add(pathname);
    batch.samples.push(pathWithQuery.length > 120 ? `${pathWithQuery.slice(0, 120)}…` : pathWithQuery);
  }

  clearTimeout(batch.timer);
  batch.timer = setTimeout(() => flushBatch(key), PREFETCH_FLUSH_MS);
}

/** @internal 单测重置批次 */
export function resetPrefetchAccessBatchesForTests(): void {
  for (const batch of batches.values()) {
    clearTimeout(batch.timer);
  }
  batches.clear();
}
