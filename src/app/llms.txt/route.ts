import { getDocAccessContext } from '@/lib/doc-access';
import { buildLlmsIndexMarkdown } from '@/lib/llms-index-for-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const access = getDocAccessContext(request);
  return new Response(buildLlmsIndexMarkdown(access), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
