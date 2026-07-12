'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import { Markdown } from '@/components/docs/markdown';
import { cn } from '@/lib/core/cn';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import type { AiAnswerStatus } from '@/components/docs/search/use-ai-search-answer';

/** 内容区最大高度，超出后滚动 */
const CONTENT_MAX_H = '200px';

/**
 * ai-answer-prose 配合 global.css 中的同名规则，用 !important 覆盖 prose 的
 * list-style，并通过 ::before 伪元素自定义 ul/ol 列表符号（避免 ::marker 渲染）。
 */
const answerMarkdownClass = cn(
  'ai-answer-prose',
  'prose prose-sm max-w-none min-w-0 w-full text-fd-foreground/90 text-xs',
  // 间距
  '[&_ul]:my-1 [&_ol]:my-1',
  '[&_li]:my-0.5',
  // inline code
  '[&_:not(pre)>code]:text-[11px] [&_:not(pre)>code]:leading-[1.35]',
  '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-fd-muted/45 [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-px',
  '[&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none',
  // headings
  '[&_h1]:text-xs [&_h1]:font-semibold [&_h1]:mt-0 [&_h1]:mb-1.5',
  '[&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:border-none [&_h2]:pb-0',
  '[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5',
  // body
  '[&_p]:my-1 [&_p]:leading-relaxed',
  '[&_strong]:font-semibold',
  '[&_a]:text-fd-primary [&_a]:underline',
  '[&_hr]:my-2 [&_hr]:border-fd-border/40',
  '[&_blockquote]:text-fd-muted-foreground',
);

export type AiSearchAnswerProps = {
  status: AiAnswerStatus;
  answer: string;
};

/** 打字机光标：流式输出时闪烁 */
function Cursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-px rounded-sm bg-fd-primary align-middle animate-[blink_0.9s_step-end_infinite]"
    />
  );
}

/** 骨架占位行：loading 时展示 */
function SkeletonLines() {
  return (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <div className="h-3 w-4/5 rounded bg-fd-muted animate-pulse" />
      <div className="h-3 w-3/5 rounded bg-fd-muted animate-pulse" />
      <div className="h-3 w-2/3 rounded bg-fd-muted animate-pulse" />
    </div>
  );
}

/** 复制按钮 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleCopy = () => {
    void safeWriteClipboard(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      title={copied ? '已复制' : '复制回答'}
      aria-label={copied ? '已复制' : '复制回答'}
      onClick={handleCopy}
      className={cn(
        'flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium transition-colors',
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-fd-border bg-transparent text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent',
      )}
    >
      {copied
        ? <><Check className="size-2.5" />已复制</>
        : <><Copy className="size-2.5" />复制</>}
    </button>
  );
}

export function AiSearchAnswer({ status, answer }: AiSearchAnswerProps) {
  if (status === 'idle') return null;

  const isStreaming = status === 'streaming';
  const isLoading = status === 'loading';
  const hasContent = answer.length > 0;

  return (
    <div className="shrink-0 border-b flex flex-col bg-fd-primary/3 dark:bg-fd-primary/6">
      {/* 标题栏 */}
      <div className="px-3 pt-2.5 pb-1.5 flex shrink-0 items-center gap-1.5">
        <Sparkles
          className={cn(
            'size-3.5 text-fd-primary shrink-0',
            isStreaming && 'animate-[spin_2s_linear_infinite]',
          )}
        />
        <span className="text-xs font-semibold text-fd-foreground/80">AI 回答</span>
        <div className="ml-auto flex items-center gap-2">
          {isStreaming && (
            <span className="text-[10px] text-fd-muted-foreground">生成中…</span>
          )}
          {hasContent && !isLoading && <CopyButton text={answer} />}
        </div>
      </div>

      {/* 内容区：固定最大高度，超出滚动 */}
      {isLoading && !hasContent && (
        <div className="px-3 pb-2.5"><SkeletonLines /></div>
      )}
      {hasContent && (
        <div
          className={cn(
            'px-3 overflow-y-auto',
            '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-fd-border',
            'hover:[&::-webkit-scrollbar-thumb]:bg-fd-muted-foreground/40',
          )}
          style={{ maxHeight: CONTENT_MAX_H }}
        >
          <div className={answerMarkdownClass}>
            <Suspense fallback={<SkeletonLines />}>
              <Markdown text={answer} />
            </Suspense>
            {isStreaming && <Cursor />}
          </div>
        </div>
      )}

      {/* 底部提示栏 */}
      <div className="px-3 pb-2 pt-1 flex shrink-0 items-center min-h-[24px]">
        {status === 'error' && (
          <p className="text-xs text-fd-muted-foreground">AI 回答生成失败，请查看以下文档。</p>
        )}
        {status === 'done' && (
          <span className="ml-auto text-[10px] text-fd-muted-foreground/70">基于搜索结果生成，仅供参考</span>
        )}
      </div>
    </div>
  );
}
