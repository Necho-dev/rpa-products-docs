import { inferSiteOrigin } from '@/lib/core/site-origin';
import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { getRSS } from '@/lib/docs/rss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const access = getDocAccessContext(request);
  const body = getRSS(access, inferSiteOrigin(request));
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}