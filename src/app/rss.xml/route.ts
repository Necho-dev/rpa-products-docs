import { getDocAccessContext } from '@/lib/doc-access';
import { getRSS } from '@/lib/rss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const access = getDocAccessContext(request);
  const body = getRSS(access);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}