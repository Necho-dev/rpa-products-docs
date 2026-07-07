'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { SortedResult } from 'fumadocs-core/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  filterAiResultsBySelectedKeywords,
  filterSearchByScope,
  type SearchScope,
} from '@/lib/docs/search/search-utils';

export type AiSearchInterpretation = {
  summary: string;
  keywords: string[];
  docFamilies?: string[];
};

type AiSearchHit = SortedResult & { matchedKeywords: string[] };

type AiSearchApiResponse = {
  interpretation: AiSearchInterpretation;
  results: AiSearchHit[];
};

type AiSearchApiError = { error: string };

const CLIENT_AI_CACHE_MAX = 32;
const clientAiCache = new Map<string, AiSearchApiResponse>();

function buildClientAiCacheKey(query: string, locale?: string): string {
  return `${locale ?? ''}\0${query.trim()}`;
}

function getClientAiCache(key: string): AiSearchApiResponse | undefined {
  const hit = clientAiCache.get(key);
  if (!hit) return undefined;
  clientAiCache.delete(key);
  clientAiCache.set(key, hit);
  return hit;
}

function setClientAiCache(key: string, value: AiSearchApiResponse): void {
  if (clientAiCache.size >= CLIENT_AI_CACHE_MAX && !clientAiCache.has(key)) {
    const oldest = clientAiCache.keys().next().value;
    if (oldest) clientAiCache.delete(oldest);
  }
  clientAiCache.delete(key);
  clientAiCache.set(key, value);
}

function partitionAiSearchKeywords(interpretation: AiSearchInterpretation): {
  topicKeywords: string[];
  platformKeywords: string[];
} {
  const families = new Set(interpretation.docFamilies ?? []);
  const platformTerms = new Set(['千牛', '连接器', '文档', ...families]);
  const topicKeywords = interpretation.keywords.filter((k) => {
    if (platformTerms.has(k)) return false;
    if (k.endsWith('连接器')) return false;
    return true;
  });
  const platformKeywords = interpretation.keywords.filter((k) => !topicKeywords.includes(k));
  return { topicKeywords, platformKeywords };
}

function selectedKeywordsFromInterpretation(interpretation: AiSearchInterpretation): Set<string> {
  const { topicKeywords } = partitionAiSearchKeywords(interpretation);
  return new Set(
    topicKeywords.length > 0
      ? topicKeywords
      : [...interpretation.keywords, ...(interpretation.docFamilies ?? [])],
  );
}

export type AiSearchErrorKind = 'rate_limited' | 'llm_timeout' | 'llm_failed' | 'ai_unavailable';

export function getAiSearchErrorMessage(error: AiSearchErrorKind): string {
  switch (error) {
    case 'rate_limited':
      return 'AI 搜索请求过于频繁，请稍后再试';
    case 'llm_timeout':
      return 'AI 语义理解超时，已回退为关键词搜索';
    case 'llm_failed':
      return 'AI 搜索暂时不可用，已回退为关键词搜索';
    case 'ai_unavailable':
      return 'AI 搜索未启用，已回退为关键词搜索';
  }
}

export type UseDocsSearchEnhancedOptions = {
  scope: SearchScope;
  locale?: string;
};

export type UseDocsSearchEnhancedResult = {
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
  /** 受控输入框内容（AI 模式下仅更新草稿，不自动请求） */
  draftInput: string;
  setDraftInput: (v: string) => void;
  /** 提交搜索（AI 模式仅点击搜索按钮；非 AI 模式支持 Enter） */
  submit: () => void;
  /** 最终展示的结果列表（已按 scope + 选中关键词过滤） */
  items: SortedResult[] | 'empty';
  /** AI 语义理解结果；仅 AI 模式命中一次成功请求后存在 */
  interpretation: AiSearchInterpretation | null;
  selectedKeywords: Set<string>;
  toggleKeyword: (keyword: string) => void;
  selectAllKeywords: () => void;
  /** 关键词搜索（AI 关闭）的加载态，或 AI 模式下 fallback 请求的加载态 */
  isLoading: boolean;
  /** AI 语义理解（LLM 调用）进行中 */
  aiLoading: boolean;
  /** 上一次 AI 提交因故障/未配置而降级为普通关键词搜索 */
  degraded: boolean;
  /** AI 请求错误（限流、超时、LLM 故障等）；成功提交后清除 */
  aiError: AiSearchErrorKind | null;
};

export function useDocsSearchEnhanced({
  scope,
  locale,
}: UseDocsSearchEnhancedOptions): UseDocsSearchEnhancedResult {
  const keywordApi = `/api/search?scope=${scope}`;
  const { search: keywordSearch, setSearch: setKeywordSearch, query: keywordQuery } = useDocsSearch(
    { type: 'fetch', api: keywordApi, locale },
    [keywordApi, locale],
  );

  const [aiEnabled, setAiEnabledState] = useState(false);
  const [draftInput, setDraftInputState] = useState('');
  const [aiResults, setAiResults] = useState<AiSearchHit[] | 'empty'>('empty');
  const [interpretation, setInterpretation] = useState<AiSearchInterpretation | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [aiError, setAiError] = useState<AiSearchErrorKind | null>(null);

  const requestSeq = useRef(0);

  const applyAiResponse = useCallback((data: AiSearchApiResponse) => {
    setInterpretation(data.interpretation);
    setAiResults(data.results);
    setSelectedKeywords(selectedKeywordsFromInterpretation(data.interpretation));
    setDegraded(false);
    setAiError(null);
  }, []);

  const runAiSubmit = useCallback(
    async (query: string) => {
      const seq = ++requestSeq.current;
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setAiResults('empty');
        setInterpretation(null);
        setDegraded(false);
        setAiError(null);
        return;
      }

      const cacheKey = buildClientAiCacheKey(trimmed, locale);
      const cached = getClientAiCache(cacheKey);
      if (cached) {
        applyAiResponse(cached);
        return;
      }

      setAiLoading(true);
      setDegraded(false);
      setAiError(null);
      try {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed, scope, locale }),
        });

        if (seq !== requestSeq.current) return;

        if (!res.ok) {
          const code = ((await res.json().catch(() => null)) as AiSearchApiError | null)?.error;
          if (res.status === 429 || code === 'rate_limited') {
            setAiError('rate_limited');
            return;
          }
          const errorKind: AiSearchErrorKind =
            code === 'llm_timeout'
              ? 'llm_timeout'
              : code === 'ai_unavailable'
                ? 'ai_unavailable'
                : 'llm_failed';
          setAiError(errorKind);
          setDegraded(true);
          setInterpretation(null);
          setAiResults('empty');
          setKeywordSearch(trimmed);
          return;
        }

        const data = (await res.json()) as AiSearchApiResponse;
        if (seq !== requestSeq.current) return;

        setClientAiCache(cacheKey, data);
        applyAiResponse(data);
      } catch {
        if (seq !== requestSeq.current) return;
        setAiError('llm_failed');
        setDegraded(true);
        setInterpretation(null);
        setAiResults('empty');
        setKeywordSearch(trimmed);
      } finally {
        if (seq === requestSeq.current) setAiLoading(false);
      }
    },
    [locale, scope, setKeywordSearch, applyAiResponse],
  );

  const submit = useCallback(() => {
    if (aiEnabled) {
      void runAiSubmit(draftInput);
      return;
    }
    const trimmed = keywordSearch.trim();
    if (trimmed) setKeywordSearch(trimmed);
  }, [aiEnabled, draftInput, keywordSearch, runAiSubmit, setKeywordSearch]);

  const setDraftInput = useCallback((v: string) => {
    setDraftInputState(v);
  }, []);

  const setAiEnabled = useCallback(
    (enabled: boolean) => {
      requestSeq.current += 1;
      setAiEnabledState(enabled);
      setAiLoading(false);
      setDegraded(false);
      setAiError(null);
      if (enabled) {
        setKeywordSearch('');
      } else {
        setAiResults('empty');
        setInterpretation(null);
        setSelectedKeywords(new Set());
      }
    },
    [setKeywordSearch],
  );

  const toggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }, []);

  const selectAllKeywords = useCallback(() => {
    if (!interpretation) return;
    setSelectedKeywords(
      new Set([
        ...interpretation.keywords,
        ...(interpretation.docFamilies ?? []),
      ]),
    );
  }, [interpretation]);

  const selectedKeywordsKey = useMemo(
    () => [...selectedKeywords].sort().join('\0'),
    [selectedKeywords],
  );

  const items = useMemo<SortedResult[] | 'empty'>(() => {
    if (!aiEnabled || degraded) return keywordQuery.data ?? 'empty';
    if (aiResults === 'empty') return 'empty';
    if (selectedKeywords.size === 0) return [];

    const { topicKeywords, platformKeywords } = interpretation
      ? partitionAiSearchKeywords(interpretation)
      : { topicKeywords: [], platformKeywords: [] };
    const families = new Set(interpretation?.docFamilies ?? []);
    const platformChipsActive = [...selectedKeywords].some(
      (k) => platformKeywords.includes(k) || families.has(k),
    );

    const byKeyword = filterAiResultsBySelectedKeywords(aiResults, selectedKeywords, {
      topicKeywords,
      platformChipsActive,
    });
    return filterSearchByScope(byKeyword, scope);
  }, [
    aiEnabled,
    degraded,
    keywordQuery.data,
    aiResults,
    selectedKeywords,
    selectedKeywordsKey,
    scope,
    interpretation,
  ]);

  return {
    aiEnabled,
    setAiEnabled,
    draftInput: aiEnabled ? draftInput : keywordSearch,
    setDraftInput: aiEnabled ? setDraftInput : setKeywordSearch,
    submit,
    items,
    interpretation,
    selectedKeywords,
    toggleKeyword,
    selectAllKeywords,
    isLoading: aiEnabled && !degraded ? false : keywordQuery.isLoading,
    aiLoading,
    degraded,
    aiError,
  };
}
