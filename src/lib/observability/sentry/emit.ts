import { parseUserAgent } from '@/lib/observability/sentry/parse-user-agent';
import { isSentryEnabled } from '@/lib/observability/sentry/env';

export type SentryAuditLevel = 'info' | 'warn' | 'error';

export type SentryAuditPayload = {
  /** 事件名，如 docs.view / sso.deny */
  event: string;
  /** 日志消息内容；未设时回退为 event */
  message: string;
  level?: SentryAuditLevel;
  tags?: Record<string, string>;
  attributes: Record<string, string | number | boolean>;
  userId?: string;
};

export function strAttr(value: string | undefined): string {
  return value ?? '';
}

export function flattenParams(
  params: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> {
  if (!params) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    out[`params.${key}`] = value;
  }
  return out;
}

/** 公共网络 / 身份属性 */
export function networkAttrs(entry: {
  accessUser?: string;
  accessOrigin?: string;
  ip?: string;
  userAgent?: string;
}): Record<string, string | number | boolean> {
  const { browser, os } = parseUserAgent(entry.userAgent);
  return {
    'user.id': strAttr(entry.accessUser),
    'cube.origin': strAttr(entry.accessOrigin),
    'client.ip': strAttr(entry.ip),
    user_agent: strAttr(entry.userAgent),
    'browser.name': browser,
    'os.name': os,
  };
}

export function networkTags(entry: {
  accessOrigin?: string;
  userAgent?: string;
  status?: number;
}): Record<string, string> {
  const { browser, os } = parseUserAgent(entry.userAgent);
  const tags: Record<string, string> = {
    'cube.origin': strAttr(entry.accessOrigin) || 'none',
    'browser.name': browser,
    'os.name': os,
  };
  if (entry.status != null) {
    tags['http.status_code'] = String(entry.status);
  }
  return tags;
}

/**
 * 向 Sentry Logs 发送一条业务审计事件。未配置 SENTRY_DSN 时 no-op。
 * message 为日志消息内容；event 走 tag + attribute，便于按类型过滤。
 */
export async function emitSentryAudit(payload: SentryAuditPayload): Promise<void> {
  if (!isSentryEnabled()) return;

  try {
    const Sentry = await import('@sentry/nextjs');
    const level = payload.level ?? 'info';
    const message = payload.message.trim() || payload.event;

    Sentry.withScope((scope) => {
      if (payload.userId) {
        scope.setUser({ id: payload.userId });
      }
      scope.setTags({
        event: payload.event,
        ...payload.tags,
      });

      const attrs = {
        event: payload.event,
        ...payload.attributes,
      };
      if (level === 'error') {
        Sentry.logger.error(message, attrs);
      } else if (level === 'warn') {
        Sentry.logger.warn(message, attrs);
      } else {
        Sentry.logger.info(message, attrs);
      }
    });
  } catch {
    /* Sentry 不可用时不影响主链路 */
  }
}

export function fireSentryAudit(payload: SentryAuditPayload): void {
  void emitSentryAudit(payload);
}
