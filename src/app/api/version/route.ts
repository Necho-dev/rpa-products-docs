import { getAppRelease, readBuildIdBuiltAt } from '@/lib/observability/build-id';
import { getSentryRelease } from '@/lib/observability/sentry/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 轻量构建版本探测：供前端长会话比对是否需硬刷新 */
export function GET() {
  const release = getAppRelease();
  const gitSha = getSentryRelease();
  const builtAt = readBuildIdBuiltAt();

  const body: { release: string; gitSha?: string; builtAt?: string } = { release };
  if (gitSha) body.gitSha = gitSha;
  if (builtAt) body.builtAt = builtAt;

  return Response.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
