import type { SharedQuotePayload } from '@/lib/docs/selection/locate-shared-quote';

export type VerifySharedQuoteResult =
  | { ok: true; quote: SharedQuotePayload }
  | { ok: false; reason: 'forbidden' | 'invalid' };

export async function verifySharedQuoteFromUrl(
  pagePath: string,
  params: URLSearchParams,
): Promise<VerifySharedQuoteResult> {
  const q = params.get('q');
  if (!q) return { ok: false, reason: 'invalid' };

  const search = new URLSearchParams({
    path: pagePath,
    q,
  });
  const p = params.get('p');
  const s = params.get('s');
  const sg = params.get('sg');
  if (p) search.set('p', p);
  if (s) search.set('s', s);
  if (sg) search.set('sg', sg);

  const res = await fetch(`/api/docs/share-quote?${search.toString()}`, {
    credentials: 'include',
  });

  if (res.status === 403) return { ok: false, reason: 'forbidden' };
  if (!res.ok) return { ok: false, reason: 'invalid' };

  const data = (await res.json()) as SharedQuotePayload;
  if (typeof data.exact !== 'string' || data.exact.length < 2) {
    return { ok: false, reason: 'invalid' };
  }

  return {
    ok: true,
    quote: {
      exact: data.exact,
      prefix: typeof data.prefix === 'string' ? data.prefix : '',
      suffix: typeof data.suffix === 'string' ? data.suffix : '',
    },
  };
}
