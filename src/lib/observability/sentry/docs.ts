import type { AccessLogEntry, AccessLogOutcome } from '@/lib/observability/access-log';
import { fireSentryAudit, networkAttrs, networkTags, strAttr } from '@/lib/observability/sentry/emit';

const DOCS_VIEW_OUTCOMES = new Set<AccessLogOutcome>(['forward', 'rewrite', 'embed_ok']);

function isDocsViewPath(path: string): boolean {
  return path.startsWith('/docs') || path.startsWith('/embed/docs');
}

/** 真实文档浏览（排除 prefetch 与非文档路径） */
export function shouldEmitDocsView(entry: Pick<AccessLogEntry, 'path' | 'outcome'>): boolean {
  if (entry.outcome === 'prefetch') return false;
  if (!DOCS_VIEW_OUTCOMES.has(entry.outcome)) return false;
  return isDocsViewPath(entry.path);
}

/** 列表主文案，如 `[docs.view] GET /docs/rpa/foo 200` */
export function formatDocsViewMessage(entry: Pick<AccessLogEntry, 'method' | 'path' | 'query' | 'status'>): string {
  const path = entry.query ? `${entry.path}?${entry.query}` : entry.path;
  return `[docs.view] ${entry.method} ${path} ${entry.status}`;
}

export function fireDocsView(entry: AccessLogEntry): void {
  if (!shouldEmitDocsView(entry)) return;

  fireSentryAudit({
    event: 'docs.view',
    message: formatDocsViewMessage(entry),
    level: 'info',
    userId: entry.accessUser,
    tags: networkTags(entry),
    attributes: {
      path: entry.path,
      method: entry.method,
      status: entry.status,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
      category: entry.category,
      query: strAttr(entry.query),
      ...networkAttrs(entry),
    },
  });
}
