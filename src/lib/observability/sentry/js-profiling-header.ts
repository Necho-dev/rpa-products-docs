import type { NextResponse } from 'next/server';
import { isSentryProfilingEnabled } from '@/lib/observability/sentry/env';

/** 运行时打开 Profile 时补 Document-Policy，避免依赖 next.config 构建期 headers */
export function applyJsProfilingDocumentPolicy(response: NextResponse): NextResponse {
  if (isSentryProfilingEnabled()) {
    response.headers.set('Document-Policy', 'js-profiling');
  }
  return response;
}
