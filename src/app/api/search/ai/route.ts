import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import {
  formatAiSearchLlmError,
  isAiSearchAvailable,
  peekCachedAiInterpretation,
  runAiSearch,
} from '@/lib/docs/search/ai-search';
import {
  checkAiSearchRateLimit,
  resolveAiSearchRateLimitKey,
} from '@/lib/docs/search/ai-search-rate-limit';
import { parseSearchScope } from '@/lib/docs/search/search-utils';

export const runtime = 'nodejs';

type AiSearchRequestBody = {
  query?: unknown;
  scope?: unknown;
  locale?: unknown;
  limit?: unknown;
};

export async function POST(request: Request) {
  if (!isAiSearchAvailable()) {
    return Response.json({ error: 'ai_unavailable' }, { status: 503 });
  }

  const access = getDocAccessContext(request);

  let body: AiSearchRequestBody;
  try {
    body = (await request.json()) as AiSearchRequestBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const query = typeof body.query === 'string' ? body.query : '';
  const scope = parseSearchScope(typeof body.scope === 'string' ? body.scope : undefined);
  const locale = typeof body.locale === 'string' ? body.locale : null;
  const limit =
    typeof body.limit === 'number' && Number.isInteger(body.limit) ? body.limit : undefined;

  // 命中 LRU 缓存时不调用 LLM，也不计入限流
  const cacheHit = Boolean(peekCachedAiInterpretation(query, locale));
  if (!cacheHit) {
    const rateLimitKey = resolveAiSearchRateLimitKey(request, access);
    const rateLimit = checkAiSearchRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
      );
    }
  }

  const result = await runAiSearch({ query, scope, locale, limit, access });

  if (!result.ok) {
    const { kind } = result.error;
    if (kind === 'llm_timeout' || kind === 'llm_failed') {
      console.error(`[AiSearch] request ${kind}`, {
        query,
        scope,
        locale,
        error:
          'cause' in result.error
            ? formatAiSearchLlmError(result.error.cause)
            : undefined,
      });
    }
    switch (kind) {
      case 'query_too_short':
        return Response.json({ error: 'query_too_short' }, { status: 400 });
      case 'unavailable':
        return Response.json({ error: 'ai_unavailable' }, { status: 503 });
      case 'llm_timeout':
        return Response.json({ error: 'llm_timeout' }, { status: 504 });
      case 'llm_failed':
        return Response.json({ error: 'llm_failed' }, { status: 502 });
    }
  }

  return Response.json(result.value);
}
