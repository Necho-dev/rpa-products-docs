import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { getLLMText, source } from '@/lib/docs/source/source';
import { inferSiteOrigin } from '@/lib/core/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = getDocAccessContext(request);
  const siteOrigin = inferSiteOrigin(request);
  const pages = source.getPages().filter((page) => isDocPageAccessible(page, access));
  const scanned = await Promise.all(
    pages.map((page) => getLLMText(page, { siteOrigin })),
  );

  return new Response(scanned.join('\n\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
