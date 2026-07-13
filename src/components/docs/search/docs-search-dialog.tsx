'use client';

import { useEffect, useState } from 'react';
import {
  SearchDialog,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';
import type { SharedProps } from 'fumadocs-ui/contexts/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { AiSearchToggle } from '@/components/docs/search/ai-search-toggle';
import { AiSearchChips } from '@/components/docs/search/ai-search-chips';
import { AiSearchAnswer } from '@/components/docs/search/ai-search-answer';
import { DocsSearchDialogInput } from '@/components/docs/search/docs-search-dialog-input';
import { useAiSearchUiEnabled } from '@/components/docs/search/ai-search-ui-context';
import { SearchScopeTabs } from '@/components/docs/search/search-scope-tabs';
import { SearchSubmitButton } from '@/components/docs/search/search-submit-button';
import { useDocsSearchEnhanced } from '@/components/docs/search/use-docs-search-enhanced';
import { useAiSearchAnswer } from '@/components/docs/search/use-ai-search-answer';
import type { SearchScope, SearchTagFilter } from '@/lib/docs/search/search-utils';
import { useSearchTags } from '@/components/docs/search/search-tags-context';

/** AI 思考动效 */
function AiThinkingIndicator() {
  return (
    <div className="flex flex-col gap-2.5 px-4 py-4 select-none">
      {/* 标题行：左对齐，图标 + 文字 + 弹跳点 */}
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 shrink-0 text-fd-primary animate-[spin_2s_linear_infinite]" />
        <span className="text-xs font-medium text-fd-foreground/70">AI 正在理解…</span>
        <div className="flex items-center gap-1 ml-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1 rounded-full bg-fd-primary/60"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
      {/* 骨架行：左对齐，较宽 */}
      <div className="flex flex-col gap-1.5 pl-5">
        <div className="h-2 rounded-full bg-fd-muted animate-pulse w-4/5" />
        <div className="h-2 rounded-full bg-fd-muted animate-pulse w-3/5" />
        <div className="h-2 rounded-full bg-fd-muted animate-pulse w-2/3" />
      </div>
    </div>
  );
}

const AI_SEARCH_PLACEHOLDER = '自然语言描述想要搜索的内容...';
const KEYWORD_SEARCH_PLACEHOLDER = '关键词搜索…';

/**
 * 模块级去重：同一 answerEpoch 只触发生成一次。
 * 用于抵御 React Strict Mode 双调用，以及 effect 依赖抖动。
 * 不放入组件 ref，以免 remount 后丢失。
 */
const handledAnswerEpochs = new Set<number>();

export type DocsSearchDialogProps = SharedProps;

export default function DocsSearchDialog(props: DocsSearchDialogProps) {
  const { locale } = useI18n();
  const aiSearchUiEnabled = useAiSearchUiEnabled();
  const searchTags = useSearchTags();
  const [scope, setScope] = useState<SearchScope>('full');
  const [tag, setTag] = useState<SearchTagFilter>(null);

  const {
    aiEnabled,
    setAiEnabled,
    draftInput,
    setDraftInput,
    submit,
    items,
    answerDocs,
    answerQuery,
    answerEpoch,
    interpretation,
    selectedKeywords,
    toggleKeyword,
    selectAllKeywords,
    isLoading,
    aiLoading,
    degraded,
    aiError,
  } = useDocsSearchEnhanced({ scope, tag, locale });

  const { status: answerStatus, answer, generate: generateAnswer, clear: clearAnswer } = useAiSearchAnswer();

  // 未配置 LLM 时确保不处于 AI 模式
  useEffect(() => {
    if (!aiSearchUiEnabled && aiEnabled) setAiEnabled(false);
  }, [aiSearchUiEnabled, aiEnabled, setAiEnabled]);

  // 新查询开始时清空旧回答
  useEffect(() => {
    if (aiEnabled && aiLoading) clearAnswer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLoading, aiEnabled]);

  // 仅在「新一次 AI 搜索成功」时生成回答（answerEpoch 递增）。
  // chip / scope / 输入草稿变化都不会触发，避免误触打满限流。
  useEffect(() => {
    if (answerEpoch === 0) {
      handledAnswerEpochs.clear();
      return;
    }
    if (!aiEnabled || aiLoading) return;
    if (handledAnswerEpochs.has(answerEpoch)) return;
    handledAnswerEpochs.add(answerEpoch);

    if (!interpretation || interpretation.intent !== 'howto' || !answerQuery || answerDocs.length === 0) {
      clearAnswer();
      return;
    }
    // clear 重置 hook 内去重签名，保证同词缓存重搜仍会生成
    clearAnswer();
    generateAnswer(answerQuery, interpretation, answerDocs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerEpoch, aiEnabled, aiLoading]);

  // 弹窗内除搜索框外，Enter 不打开结果（仅鼠标点击）；搜索框 Enter 在 onKeyDown 中提交
  useEffect(() => {
    if (!props.open) return;
    const guardEnterInDialog = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[role="dialog"]')) return;
      if (target.tagName === 'INPUT') return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', guardEnterInDialog, true);
    return () => window.removeEventListener('keydown', guardEnterInDialog, true);
  }, [props.open]);

  // `SearchDialogFooter`（以及非 Content/Overlay 的其他子节点）不经过 Radix 的
  // 打开态门控渲染；预加载（preload）机制会在弹窗从未打开时就挂载该组件树，
  // 因此这里必须自行按 `open` 屏蔽内容，否则会在页面上一直可见。
  if (!props.open) {
    return (
      <SearchDialog search={draftInput} onSearchChange={setDraftInput} isLoading={false} {...props}>
        <SearchDialogOverlay />
        <SearchDialogContent />
      </SearchDialog>
    );
  }

  return (
    <SearchDialog
      search={draftInput}
      onSearchChange={setDraftInput}
      isLoading={aiEnabled ? aiLoading : isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent
        aria-describedby={undefined}
        className="overflow-hidden flex flex-col max-h-[min(90dvh,680px)]"
      >
        <SearchDialogHeader className="shrink-0">
          <DocsSearchDialogInput
            placeholder={
              aiSearchUiEnabled && aiEnabled
                ? AI_SEARCH_PLACEHOLDER
                : KEYWORD_SEARCH_PLACEHOLDER
            }
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.nativeEvent.isComposing || !aiSearchUiEnabled || aiEnabled) return;
              e.preventDefault();
              e.stopPropagation();
              submit();
            }}
          />
          {aiSearchUiEnabled && (
            <AiSearchToggle
              enabled={aiEnabled}
              onChange={setAiEnabled}
              disabled={aiLoading}
            />
          )}
          <SearchSubmitButton
            onClick={submit}
            loading={aiEnabled ? aiLoading : isLoading}
          />
        </SearchDialogHeader>
        {aiEnabled && (interpretation || aiError) && (
          <div className="shrink-0">
            <AiSearchChips
              interpretation={interpretation}
              selectedKeywords={selectedKeywords}
              onToggle={toggleKeyword}
              onSelectAll={selectAllKeywords}
              degraded={degraded}
              aiError={aiError}
            />
          </div>
        )}
        {aiEnabled && interpretation?.intent === 'howto' && (
          <AiSearchAnswer status={answerStatus} answer={answer} />
        )}
        {/* AI 思考状态：优先展示，覆盖结果列表区域 */}
        {aiEnabled && aiLoading ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <AiThinkingIndicator />
          </div>
        ) : (
          /*
           * 外层承担滚动：AI 回答/chips 占位后，列表区域 flex-1 + min-h-0 才能收缩并可滚。
           * fumadocs SearchDialogList 用 --fd-animated-height 按内容撑高，需 !h-auto 取消，
           * 并去掉内部 max-h-[460px]，避免双层滚动抢高度。
           */
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain',
              '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent',
              '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-fd-border',
              'hover:[&::-webkit-scrollbar-thumb]:bg-fd-muted-foreground/40',
            )}
          >
            <SearchDialogList
              className="h-auto! overflow-visible [&>div]:max-h-none! [&>div]:overflow-visible"
              items={items === 'empty' ? null : items}
              Item={(itemProps) => (
                <SearchDialogListItem
                  {...itemProps}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              )}
            />
          </div>
        )}
        <SearchDialogFooter className="shrink-0">
          <SearchScopeTabs
            tag={tag}
            onTagChange={setTag}
            tags={searchTags}
            scope={scope}
            onScopeChange={setScope}
          />
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
