import { isPrivateDocAccessConfigured } from '@/lib/docs/access/doc-access';
import { siteName } from '@/lib/core/shared';
import { source } from '@/lib/docs/source/source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 容器 / 负载均衡探活 + 基础运行时信息 */
export function GET() {
  const pageCount = source.getPages().length;

  const body = {
    status: 'ok',
    site: siteName,
    docs: {
      pages: pageCount,
      privateAccessConfigured: isPrivateDocAccessConfigured(),
    },
    runtime: {
      node: process.version,
      uptime: Math.floor(process.uptime()),
    },
    timestamp: new Date().toISOString(),
  };

  return Response.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
