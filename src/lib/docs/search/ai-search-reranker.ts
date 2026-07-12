import { generateText } from 'ai';
import { z } from 'zod';
import { getLlmJsonModel } from '@/lib/ai/llm';
import type { SearchHitWithKeywords } from '@/lib/docs/search/search-utils';

const RerankItemSchema = z.object({
  url: z.string().min(1),
  score: z.number().min(0).max(1),
});

const RerankResponseSchema = z.object({
  rankings: z.array(RerankItemSchema).min(1),
});

const AI_SEARCH_RERANK_TIMEOUT_MS = (() => {
  const raw = process.env.AI_SEARCH_RERANK_TIMEOUT_MS?.trim();
  if (!raw) return 8_000;
  const ms = Number.parseInt(raw, 10);
  return Number.isFinite(ms) && ms >= 2_000 ? ms : 8_000;
})();

/**
 * 候选上限：过多候选会使 prompt 过长、延迟上升。
 * 10 条在绝大多数查询中已足够，且可在 ~3–5s 内完成重排。
 */
const RERANK_CANDIDATE_LIMIT = 10;

const RERANK_SYSTEM_PROMPT = `You are a relevance reranker for an internal documentation search engine (connectors / components / app deployment docs, mostly Chinese).

Given the user's search query and a list of candidate documents (url, title, description, breadcrumbs), score each candidate's semantic relevance to the query.

Rules:
- score is a number from 0 to 1 (1 = highly relevant, 0 = irrelevant)
- Prefer documents that match the user's intent even if wording differs (synonyms, domain jargon, related product names)
- Prefer specific connector/page docs over generic hub/index pages when the query has a concrete topic
- Do NOT invent urls — only score the provided candidates
- Respond ONLY with JSON: { "rankings": [ { "url": "...", "score": 0.0 } ] }
- Include every candidate url exactly once`;

type RerankCandidate = {
  url: string;
  title: string;
  description: string;
  breadcrumbs: string[];
  type: string;
};

function toCandidate(hit: SearchHitWithKeywords): RerankCandidate {
  return {
    url: hit.url,
    title: String(hit.content ?? '').replace(/<[^>]+>/g, '').slice(0, 120),
    description: (hit.breadcrumbs ?? []).join(' › ').slice(0, 160),
    breadcrumbs: hit.breadcrumbs ?? [],
    type: hit.type,
  };
}

function parseJsonFromLlmText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new SyntaxError('LLM returned empty output');

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)(?:```|$)/s);
  const unwrapped = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const firstBrace = unwrapped.indexOf('{');
  const lastBrace = unwrapped.lastIndexOf('}');
  const candidate = firstBrace !== -1
    ? (lastBrace > firstBrace ? unwrapped.slice(firstBrace, lastBrace + 1) : unwrapped.slice(firstBrace))
    : unwrapped;

  if (!candidate) throw new SyntaxError('LLM output contains no JSON object');

  try {
    return JSON.parse(candidate);
  } catch {
    return JSON.parse(repairTruncatedJson(candidate));
  }
}

function repairTruncatedJson(s: string): string {
  if (!s) return '{}';

  const stack: Array<'{' | '['> = [];
  let inString = false;
  let lastSafeIdx = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    switch (ch) {
      case '"': inString = true; break;
      case '{': stack.push('{'); break;
      case '[': stack.push('['); break;
      case '}': case ']': stack.pop(); lastSafeIdx = i + 1; break;
      case ',': if (stack.length > 0) lastSafeIdx = i; break;
    }
  }

  if (stack.length === 0) return s;
  const safe = lastSafeIdx > 0 ? s.slice(0, lastSafeIdx) : s;
  const closing = [...stack].reverse().map((c) => (c === '{' ? '}' : ']')).join('');
  return safe + closing;
}

function dedupePageHits(hits: SearchHitWithKeywords[]): SearchHitWithKeywords[] {
  const byUrl = new Map<string, SearchHitWithKeywords>();
  for (const hit of hits) {
    const existing = byUrl.get(hit.url);
    if (!existing) {
      byUrl.set(hit.url, hit);
      continue;
    }
    // Prefer page-level hits for rerank input; keep richer matchedKeywords
    if (hit.type === 'page' && existing.type !== 'page') {
      byUrl.set(hit.url, {
        ...hit,
        matchedKeywords: [
          ...new Set([...hit.matchedKeywords, ...existing.matchedKeywords]),
        ],
      });
      continue;
    }
    for (const kw of hit.matchedKeywords) {
      if (!existing.matchedKeywords.includes(kw)) existing.matchedKeywords.push(kw);
    }
  }
  return [...byUrl.values()];
}

/**
 * 用 LLM 对候选结果做语义相关性重排。
 * 失败/超时时返回原顺序（降级），不抛错。
 */
export async function rerankSearchHits(
  query: string,
  hits: SearchHitWithKeywords[],
): Promise<SearchHitWithKeywords[]> {
  if (hits.length <= 1) return hits;

  const pageFirst = dedupePageHits(hits);
  const candidates = pageFirst.slice(0, RERANK_CANDIDATE_LIMIT);
  const remainder = pageFirst.slice(RERANK_CANDIDATE_LIMIT);

  try {
    const { text } = await generateText({
      model: getLlmJsonModel(),
      system: RERANK_SYSTEM_PROMPT,
      prompt: JSON.stringify(
        {
          query,
          candidates: candidates.map(toCandidate),
        },
        null,
        2,
      ),
      abortSignal: AbortSignal.timeout(AI_SEARCH_RERANK_TIMEOUT_MS),
    });

    const parsed = RerankResponseSchema.parse(parseJsonFromLlmText(text));
    const scoreByUrl = new Map(parsed.rankings.map((r) => [r.url, r.score]));

    const scored = [...candidates].sort((a, b) => {
      const sa = scoreByUrl.get(a.url) ?? 0;
      const sb = scoreByUrl.get(b.url) ?? 0;
      if (sb !== sa) return sb - sa;
      return String(a.content).localeCompare(String(b.content), 'zh-CN');
    });

    // 将非 page 片段挂回对应 url 的 page 之后，保持原有 snippet 信息
    const snippetsByUrl = new Map<string, SearchHitWithKeywords[]>();
    for (const hit of hits) {
      if (hit.type === 'page') continue;
      const list = snippetsByUrl.get(hit.url) ?? [];
      list.push(hit);
      snippetsByUrl.set(hit.url, list);
    }

    const expanded: SearchHitWithKeywords[] = [];
    const pushWithSnippets = (primary: SearchHitWithKeywords) => {
      expanded.push(primary);
      const snippets = snippetsByUrl.get(primary.url);
      if (!snippets) return;
      for (const snippet of snippets) {
        if (snippet.id === primary.id) continue;
        expanded.push(snippet);
      }
    };

    for (const pageHit of scored) {
      pushWithSnippets(pageHit);
    }
    for (const hit of remainder) {
      pushWithSnippets(hit);
    }

    return expanded;
  } catch (cause) {
    console.warn('[AiSearch] rerank failed, keeping keyword order', {
      query,
      candidateCount: candidates.length,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return hits;
  }
}
