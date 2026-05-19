import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { filterSearchHitsByDocAccess } from '@/lib/docs/docs-site-tools';
import { getDocsSearchApi } from '@/lib/docs/search/docs-search-server';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  if (!query) {
    return Response.json([]);
  }

  const limitParam = url.searchParams.get('limit');
  const limitN = limitParam && Number.isInteger(Number(limitParam)) ? Number(limitParam) : undefined;
  const readOptions = {
    tag: url.searchParams.get('tag')?.split(',')?.filter(Boolean),
    locale: url.searchParams.get('locale') ?? null,
    limit: limitN,
  };

  const access = getDocAccessContext(request);
  const raw = await getDocsSearchApi().search(query, readOptions);
  const filtered = filterSearchHitsByDocAccess(raw, access);

  return Response.json(filtered);
}
