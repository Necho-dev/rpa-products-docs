import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { resolveAuthContext } from '@/lib/auth/auth-core';
import { isValidCubeOrigin } from '@/lib/auth/cube';
import { readCubeOriginFromCookieHeader } from '@/lib/auth/session';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { docFeedbackWebhookUrl, isDocFeedbackEnabled } from '@/lib/docs/feedback/config';
import { isDocFeedbackReason } from '@/lib/docs/feedback/reasons';
import type { DocFeedbackSource } from '@/lib/docs/feedback/types';
import { sanitizeWebhookTextField } from '@/lib/docs/feedback/webhook-text';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const MAX_ERROR_CONTENT = 4000;
const MAX_DESCRIPTION = 2000;

function parseBody(body: unknown): {
  errorContent: string;
  docUrl: string;
  reason: string;
  description?: string;
  source: DocFeedbackSource;
  pagePath?: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;

  const errorContent = typeof raw.errorContent === 'string' ? raw.errorContent.trim() : '';
  const docUrl = typeof raw.docUrl === 'string' ? raw.docUrl.trim() : '';
  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
  const description =
    typeof raw.description === 'string' ? raw.description.trim() : undefined;
  const source = raw.source;
  const pagePath = typeof raw.pagePath === 'string' ? raw.pagePath.trim() : undefined;

  if (!errorContent || errorContent.length > MAX_ERROR_CONTENT) return null;
  if (!docUrl) return null;
  try {
    const parsed = new URL(docUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  if (!isDocFeedbackReason(reason)) return null;
  if (description && description.length > MAX_DESCRIPTION) return null;
  if (source !== 'selection' && source !== 'document') return null;

  return {
    errorContent,
    docUrl,
    reason,
    description: description || undefined,
    source,
    pagePath: pagePath || undefined,
  };
}

function resolveLoginOrigin(cookieHeader: string | null): string {
  const raw = readCubeOriginFromCookieHeader(cookieHeader);
  if (!raw) {
    console.warn('[DocFeedback] missing ACCESSORIGIN cookie');
    return '';
  }
  if (!isValidCubeOrigin(raw)) {
    console.warn('[DocFeedback] invalid ACCESSORIGIN cookie:', raw);
    return '';
  }
  return raw;
}

export async function POST(req: Request) {
  if (!isDocFeedbackEnabled()) {
    return NextResponse.json({ error: 'feedback_disabled' }, { status: 503 });
  }

  const webhookUrl = docFeedbackWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json({ error: 'feedback_disabled' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const auth = resolveAuthContext(req);
  if (isCubeSsoEnabled() && !auth.isAuthenticated) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const hdrs = await headers();
  const siteOrigin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, {
      headers: Object.fromEntries(hdrs.entries()),
    }),
  );

  let docOrigin: string;
  try {
    docOrigin = new URL(parsed.docUrl).origin;
  } catch {
    return NextResponse.json({ error: 'invalid docUrl' }, { status: 400 });
  }

  if (docOrigin !== siteOrigin) {
    return NextResponse.json({ error: 'invalid docUrl origin' }, { status: 400 });
  }

  const reporter = auth.session?.u ?? '';
  const loginOrigin = resolveLoginOrigin(req.headers.get('cookie'));

  const webhookPayload = {
    错误内容: sanitizeWebhookTextField(parsed.errorContent),
    错误文档链接: parsed.docUrl,
    错误原因: parsed.reason,
    其他补充描述: sanitizeWebhookTextField(parsed.description ?? ''),
    反馈来源: parsed.source,
    反馈人: sanitizeWebhookTextField(reporter),
    登录来源站: loginOrigin,
    文档路径: parsed.pagePath ?? '',
    提交时间: new Date().toISOString(),
  };

  let webhookRes: Response;
  try {
    webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
  } catch (err) {
    console.error('[DocFeedback] webhook fetch failed:', err);
    return NextResponse.json({ error: 'webhook_failed' }, { status: 502 });
  }

  if (!webhookRes.ok) {
    console.error('[DocFeedback] webhook non-2xx:', webhookRes.status);
    return NextResponse.json({ error: 'webhook_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
