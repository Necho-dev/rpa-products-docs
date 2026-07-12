'use client';

import { useEffect, useMemo, useState } from 'react';
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

  // AI 搜索完成后，自动触发 howto 回答生成
  const topDocs = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items
      .filter((r) => r.type === 'page')
      .slice(0, 5)
      .map((r) => ({
        url: r.url,
        content: typeof r.content === 'string' ? r.content : String(r.content ?? ''),
        breadcrumbs: (r.breadcrumbs as string[] | undefined) ?? [],
        type: r.type,
      }));
  }, [items]);

  // 新查询开始（aiLoading 变 true）时立即清空旧回答，避免旧内容与加载动效同时出现
  useEffect(() => {
    if (aiEnabled && aiLoading) clearAnswer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiLoading, aiEnabled]);

  useEffect(() => {
    if (!aiEnabled || !interpretation || aiLoading) return;
    if (interpretation.intent !== 'howto') {
      clearAnswer();
      return;
    }
    if (topDocs.length === 0) return;
    generateAnswer(draftInput, interpretation, topDocs);
  // 当 interpretation 或 topDocs 变化时重新生成（新查询结果到达）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpretation, topDocs]);

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
      {/*
       * overflow-visible 保留给 Popover 下拉；
       * max-h 限制弹窗整体不超出视口，flex flex-col 让内部各区域弹性分配高度。
       */}
      <SearchDialogContent className="overflow-visible flex flex-col max-h-[min(90dvh,680px)]">
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
          <AiSearchChips
            interpretation={interpretation}
            selectedKeywords={selectedKeywords}
            onToggle={toggleKeyword}
            onSelectAll={selectAllKeywords}
            degraded={degraded}
            aiError={aiError}
          />
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
          /* [&>div]:max-h-none 覆盖 fumadocs 内部硬编码的 max-h-[460px]，由外层 flex 控制高度 */
          <SearchDialogList
            className="min-h-0 flex-1 overflow-hidden [&>div]:max-h-none [&>div]:overflow-y-auto"
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
