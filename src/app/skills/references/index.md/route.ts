import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { buildLlmsIndexMarkdown } from '@/lib/docs/llms/llms-index-for-access';
import { inferSiteOrigin } from '@/lib/core/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const access = getDocAccessContext(request);
  const origin = inferSiteOrigin(request);
  return new Response(buildLlmsIndexMarkdown(access, origin), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
