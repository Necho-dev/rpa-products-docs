import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { filterSearchHitsByDocAccess } from '@/lib/docs/docs-site-tools';
import { getDocsSearchApi } from '@/lib/docs/search/docs-search-server';
import { filterSearchByScope, parseSearchScope } from '@/lib/docs/search/search-utils';

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
  const scope = parseSearchScope(url.searchParams.get('scope'));

  const access = getDocAccessContext(request);
  const raw = await getDocsSearchApi().search(query, readOptions);
  const filtered = filterSearchByScope(filterSearchHitsByDocAccess(raw, access), scope, query);

  return Response.json(filtered);
}
