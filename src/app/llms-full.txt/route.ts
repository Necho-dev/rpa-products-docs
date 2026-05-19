import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { getLLMText, source } from '@/lib/docs/source/source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = getDocAccessContext(request);
  const pages = source.getPages().filter((page) => isDocPageAccessible(page, access));
  const scanned = await Promise.all(pages.map(getLLMText));

  return new Response(scanned.join('\n\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
