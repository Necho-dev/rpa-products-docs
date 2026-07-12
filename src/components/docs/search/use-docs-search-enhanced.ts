'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SortedResult } from 'fumadocs-core/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  dedupeSearchResults,
  filterSearchByScope,
  type SearchScope,
  type SearchTagFilter,
} from '@/lib/docs/search/search-utils';

export type AiSearchInterpretation = {
  summary: string;
  keywords: string[];
  /** keywords 中最核心的 1-3 个词，默认选中为活跃 Chip */
  primaryKeywords: string[];
  intent: 'browse' | 'find' | 'howto' | 'compare' | 'general';
  platformScope?: string;
};

type AiSearchHit = SortedResult & { matchedKeywords: string[] };

type AiSearchApiResponse = {
  interpretation: AiSearchInterpretation;
  results: AiSearchHit[];
};

type AiSearchApiError = { error: string };

const CLIENT_AI_CACHE_MAX = 32;
const clientAiCache = new Map<string, AiSearchApiResponse>();

function buildClientAiCacheKey(query: string, locale?: string, tag?: string | null): string {
  return `${locale ?? ''}\0${tag ?? ''}\0${query.trim()}`;
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

/**
 * 初始默认只选中 primaryKeywords（核心词），其余扩展词默认不选中。
 * 若 primaryKeywords 为空（旧缓存兼容）则退回全选。
 */
function selectedKeywordsFromInterpretation(interpretation: AiSearchInterpretation): Set<string> {
  const primary = interpretation.primaryKeywords?.filter((k) => interpretation.keywords.includes(k));
  if (primary && primary.length > 0) return new Set(primary);
  return new Set(interpretation.keywords);
}

/**
 * 按当前选中的 Chip 过滤结果（OR 语义：命中任意一个选中词即保留）。
 * browse 展开的伪关键词 `__browse_expand__` 始终保留。
 */
function filterBySelectedKeywords(
  results: AiSearchHit[],
  selectedKeywords: Set<string>,
): AiSearchHit[] {
  if (selectedKeywords.size === 0) return [];
  return results.filter(
    (r) =>
      r.matchedKeywords.includes('__browse_expand__') ||
      r.matchedKeywords.some((k) => selectedKeywords.has(k)),
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
  /** 分区 tag 过滤；null 表示全部分区 */
  tag: SearchTagFilter;
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
  tag,
  locale,
}: UseDocsSearchEnhancedOptions): UseDocsSearchEnhancedResult {
  const keywordApi = tag
    ? `/api/search?scope=${scope}&tag=${encodeURIComponent(tag)}`
    : `/api/search?scope=${scope}`;
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
  /** 最近一次成功提交的 AI 查询词，用于 page 模式 title 排序 */
  const [lastAiQuery, setLastAiQuery] = useState<string>('');

  // tag 切换时，清空 AI 结果（检索范围变化，旧结果已失效）
  // 使用 React 官方推荐的"渲染阶段 setState"模式（storing previous prop in state）：
  // 在渲染期发现 tag 变化时立即 setState，React 会丢弃当前渲染结果并立即重新渲染，
  // 不会触发额外的 commit/effect，比 useEffect 更高效。
  const [prevTag, setPrevTag] = useState(tag);
  if (prevTag !== tag) {
    setPrevTag(tag);
    if (aiEnabled) {
      setAiResults('empty');
      setInterpretation(null);
      setSelectedKeywords(new Set());
      setAiLoading(false);
      setDegraded(false);
      setAiError(null);
      setLastAiQuery('');
    }
  }

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

      const cacheKey = buildClientAiCacheKey(trimmed, locale, tag);
      const cached = getClientAiCache(cacheKey);
      if (cached) {
        setLastAiQuery(trimmed);
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
          body: JSON.stringify({
            query: trimmed,
            scope,
            locale,
            ...(tag ? { tag } : {}),
          }),
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

        setLastAiQuery(trimmed);
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
    [locale, scope, tag, setKeywordSearch, applyAiResponse],
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
    // 全选 = 选中全部 keywords（含扩展词）
    setSelectedKeywords(new Set(interpretation.keywords));
  }, [interpretation]);

  const selectedKeywordsKey = useMemo(
    () => [...selectedKeywords].sort().join('\0'),
    [selectedKeywords],
  );

  const items = useMemo<SortedResult[] | 'empty'>(() => {
    if (!aiEnabled || degraded) {
      const raw = keywordQuery.data ?? 'empty';
      return raw === 'empty' ? 'empty' : dedupeSearchResults(raw);
    }
    if (aiResults === 'empty') return 'empty';
    if (selectedKeywords.size === 0) return [];

    const byKeyword = filterBySelectedKeywords(aiResults, selectedKeywords);
    const scoped = filterSearchByScope(byKeyword, scope, lastAiQuery);
    return dedupeSearchResults(scoped);
  }, [
    aiEnabled,
    degraded,
    keywordQuery.data,
    aiResults,
    selectedKeywords,
    scope,
    lastAiQuery,
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
