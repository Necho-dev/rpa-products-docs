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
import { AiSearchToggle } from '@/components/docs/search/ai-search-toggle';
import { AiSearchChips } from '@/components/docs/search/ai-search-chips';
import { DocsSearchDialogInput } from '@/components/docs/search/docs-search-dialog-input';
import { useAiSearchUiEnabled } from '@/components/docs/search/ai-search-ui-context';
import { SearchScopeTabs } from '@/components/docs/search/search-scope-tabs';
import { SearchSubmitButton } from '@/components/docs/search/search-submit-button';
import { useDocsSearchEnhanced } from '@/components/docs/search/use-docs-search-enhanced';
import type { SearchScope } from '@/lib/docs/search/search-utils';

const AI_SEARCH_PLACEHOLDER = '自然语言描述想要搜索的内容...';
const KEYWORD_SEARCH_PLACEHOLDER = '关键词搜索…';

export type DocsSearchDialogProps = SharedProps;

export default function DocsSearchDialog(props: DocsSearchDialogProps) {
  const { locale } = useI18n();
  const aiSearchUiEnabled = useAiSearchUiEnabled();
  const [scope, setScope] = useState<SearchScope>('full');

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
  } = useDocsSearchEnhanced({ scope, locale });

  // 未配置 LLM 时确保不处于 AI 模式
  useEffect(() => {
    if (!aiSearchUiEnabled && aiEnabled) setAiEnabled(false);
  }, [aiSearchUiEnabled, aiEnabled, setAiEnabled]);

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
      <SearchDialogContent className="overflow-visible">
        <SearchDialogHeader>
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
        <SearchDialogList
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
        <SearchDialogFooter>
          <SearchScopeTabs scope={scope} onChange={setScope} />
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
