'use client';

import { useCallback, useRef, useState } from 'react';
import type { AiSearchInterpretation } from '@/components/docs/search/use-docs-search-enhanced';

export type AiAnswerStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export type AiAnswerDoc = {
  url: string;
  content: string;
  breadcrumbs?: string[];
  type?: string;
};

export type UseAiSearchAnswerResult = {
  status: AiAnswerStatus;
  answer: string;
  /** 触发生成：传入当前查询词、interpretation、top 文档 */
  generate: (query: string, interpretation: AiSearchInterpretation, docs: AiAnswerDoc[]) => void;
  /** 取消当前流式请求 */
  cancel: () => void;
  /** 清空回答（切换查询时调用） */
  clear: () => void;
};

export function useAiSearchAnswer(): UseAiSearchAnswerResult {
  const [status, setStatus] = useState<AiAnswerStatus>('idle');
  const [answer, setAnswer] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const clear = useCallback(() => {
    cancel();
    seqRef.current += 1;
    setStatus('idle');
    setAnswer('');
  }, [cancel]);

  const generate = useCallback(
    async (query: string, interpretation: AiSearchInterpretation, docs: AiAnswerDoc[]) => {
      // 只有 howto intent 才生成回答
      if (interpretation.intent !== 'howto') {
        clear();
        return;
      }
      if (docs.length === 0) {
        clear();
        return;
      }

      const seq = ++seqRef.current;
      cancel();

      const controller = new AbortController();
      abortRef.current = controller;

      setAnswer('');
      setStatus('loading');

      try {
        const res = await fetch('/api/search/ai-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            intent: interpretation.intent,
            docs: docs.map((d) => ({
              url: d.url,
              content: d.content,
              breadcrumbs: d.breadcrumbs,
              type: d.type,
            })),
          }),
          signal: controller.signal,
        });

        if (seq !== seqRef.current) return;

        if (!res.ok || !res.body) {
          setStatus('error');
          return;
        }

        setStatus('streaming');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (seq !== seqRef.current) {
            reader.cancel();
            return;
          }
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setAnswer(accumulated);
        }

        if (seq === seqRef.current) {
          setStatus('done');
        }
      } catch (err) {
        if (seq !== seqRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setStatus('error');
      }
    },
    [cancel, clear],
  );

  return { status, answer, generate, cancel, clear };
}
