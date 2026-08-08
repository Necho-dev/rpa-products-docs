import type { AccessLogEntry, AccessLogOutcome } from '@/lib/observability/access-log';
import type { SsoLogEntry, SsoLogOutcome } from '@/lib/observability/sso-audit-log';
import { fireSentryAudit, networkAttrs, networkTags, strAttr } from '@/lib/observability/sentry/emit';
import { attachTraceContext } from '@/lib/observability/sentry/trace-context';
import { resolveAuthMethod } from '@/lib/observability/request-enrichment';
import { getSentryRelease } from '@/lib/observability/sentry/env';

const AUTH_DENY_OUTCOMES = new Set<AccessLogOutcome>([
  'ua_denied',
  'embed_denied',
  'embed_block',
  'og_denied',
]);

/** Proxy 层鉴权拒绝（UA 门禁 / 嵌入验签 / OG 门禁） */
export function shouldEmitAuthDeny(entry: Pick<AccessLogEntry, 'outcome'>): boolean {
  return AUTH_DENY_OUTCOMES.has(entry.outcome);
}

/**
 * SSO 门禁：仅上报拦截类结果。
 * - redirect：未登录被踢去登录页（成功拦截）
 * - unauthorized：401
 * pass 不上报（与正常流量重复、噪声大）
 */
export function shouldEmitSsoGate(entry: Pick<SsoLogEntry, 'outcome'>): boolean {
  return entry.outcome === 'redirect' || entry.outcome === 'unauthorized';
}

function ssoEventName(outcome: SsoLogOutcome): 'sso.redirect' | 'sso.deny' {
  return outcome === 'redirect' ? 'sso.redirect' : 'sso.deny';
}

function authDenyMessage(entry: AccessLogEntry): string {
  return `[auth.deny] ${entry.outcome} ${entry.method} ${entry.path} ${entry.status}`;
}

function ssoGateMessage(entry: SsoLogEntry, event: string): string {
  const redirect = entry.redirectTo ? ` → ${entry.redirectTo}` : '';
  return `[${event}] ${entry.method} ${entry.path} ${entry.status}${redirect}`;
}

function enrichTags(entry: {
  authorization?: AccessLogEntry['authorization'];
  outcome?: string;
  path?: string;
  rsc?: boolean;
  geoCountry?: string;
  asn?: string;
}): Record<string, string> {
  const tags: Record<string, string> = {
    'auth.method': resolveAuthMethod({
      authorization: entry.authorization,
      outcome: entry.outcome,
      path: entry.path,
    }),
  };
  if (entry.rsc != null) tags['http.rsc'] = String(entry.rsc);
  if (entry.geoCountry) tags['geo.country'] = entry.geoCountry;
  if (entry.asn) tags['geo.asn'] = entry.asn;
  const release = getSentryRelease();
  if (release) tags['git.sha'] = release;
  return tags;
}

function enrichAttrs(entry: {
  authorization?: AccessLogEntry['authorization'];
  outcome?: string;
  path?: string;
  rsc?: boolean;
  geoCountry?: string;
  geoRegion?: string;
  asn?: string;
}): Record<string, string | number | boolean> {
  const authMethod = resolveAuthMethod({
    authorization: entry.authorization,
    outcome: entry.outcome,
    path: entry.path,
  });
  const release = getSentryRelease();
  return {
    'auth.method': authMethod,
    'http.rsc': entry.rsc === true,
    'geo.country': strAttr(entry.geoCountry),
    'geo.region': strAttr(entry.geoRegion),
    'geo.asn': strAttr(entry.asn),
    ...(release ? { 'git.sha': release, release } : {}),
  };
}

export function fireAuthDeny(entry: AccessLogEntry): void {
  if (!shouldEmitAuthDeny(entry)) return;

  fireSentryAudit({
    event: 'auth.deny',
    message: authDenyMessage(entry),
    level: 'warn',
    userId: entry.accessUser,
    tags: {
      ...networkTags(entry),
      ...enrichTags(entry),
      'auth.reason': entry.outcome,
      'auth.category': entry.category,
    },
    attributes: {
      path: entry.path,
      method: entry.method,
      status: entry.status,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
      category: entry.category,
      query: strAttr(entry.query),
      ...enrichAttrs(entry),
      ...networkAttrs(entry),
    },
  });
}

export function fireSsoGate(entry: SsoLogEntry): void {
  if (!shouldEmitSsoGate(entry)) return;

  const event = ssoEventName(entry.outcome);
  const authMethod = resolveAuthMethod({
    authorization: entry.authorization,
    outcome: entry.outcome,
    path: entry.path,
  });

  attachTraceContext({
    accessUser: entry.accessUser,
    accessOrigin: entry.accessOrigin,
    ip: entry.ip,
    userAgent: entry.userAgent,
    status: entry.status,
    category: entry.category,
    outcome: entry.outcome,
    authMethod,
    rsc: entry.rsc,
    geoCountry: entry.geoCountry,
    geoRegion: entry.geoRegion,
    asn: entry.asn,
  });

  fireSentryAudit({
    event,
    message: ssoGateMessage(entry, event),
    level: entry.outcome === 'unauthorized' ? 'warn' : 'info',
    userId: entry.accessUser,
    tags: {
      ...networkTags(entry),
      ...enrichTags(entry),
      'sso.outcome': entry.outcome,
      'auth.category': entry.category,
    },
    attributes: {
      path: entry.path,
      method: entry.method,
      status: entry.status,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
      category: entry.category,
      redirect_to: strAttr(entry.redirectTo),
      query: strAttr(entry.query),
      ...enrichAttrs(entry),
      ...networkAttrs(entry),
    },
  });
}
