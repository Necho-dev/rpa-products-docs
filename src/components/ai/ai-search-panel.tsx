'use client';
import { useEffect } from 'react';
import { cn } from '@/lib/core/cn';
import { Presence } from '@radix-ui/react-presence';
import { useAISearchContext } from '@/components/ai/ai-search-context';
import { useHotKey } from '@/components/ai/use-ai-hotkey';
import { AISearchPanelHeader } from '@/components/ai/ai-search-header';
import { AISearchHistoryPanel } from '@/components/ai/ai-search-history-panel';
import { AISearchPanelList } from '@/components/ai/ai-search-messages';
import { AISearchInput, AISearchPanelFooter } from '@/components/ai/ai-search-input';

export function AISearchPanel() {
  const { open, setOpen, panelView, setPanelView } = useAISearchContext();
  useHotKey();

  // 每次重新打开面板时回到 chat 视图
  useEffect(() => {
    if (open) setPanelView('chat');
  }, [open, setPanelView]);

  return (
    <>
      <style>
        {`
        @keyframes ask-ai-open {
          from {
            translate: 100% 0;
          }
          to {
            translate: 0 0;
          }
        }
        @keyframes ask-ai-close {
          from {
            width: var(--ai-chat-width);
          }
          to {
            width: 0px;
          }
        }`}
      </style>
      <Presence present={open}>
        <div
          data-state={open ? 'open' : 'closed'}
          className="fixed inset-0 z-40 backdrop-blur-xs bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out lg:hidden"
          onClick={() => setOpen(false)}
        />
      </Presence>
      <Presence present={open}>
        <div
          className={cn(
            /* 悬浮层，不占用任何布局空间 */
            'fixed z-50 overflow-hidden bg-fd-card text-fd-card-foreground shadow-2xl border rounded-2xl',
            '[--ai-chat-width:min(calc(100vw-1.25rem),640px)]',
            /* 小屏：铺满视口 */
            'max-lg:inset-x-1.5 max-lg:inset-y-3',
            /* 大屏：右下角浮窗；必须同时设 h（或 height）才能让内部 flex 列正确分配 */
            'lg:[--ai-chat-width:600px]',
            'lg:bottom-[max(4.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))]',
            'lg:inset-e-[max(1.25rem,calc(1.25rem+var(--removed-body-scroll-bar-size,0px)))]',
            /* 固定高度：默认 960px，视口不够时收缩，保底 400px */
            'lg:h-[min(960px,calc(100dvh-6rem))] lg:min-h-[400px]',
            open ? 'animate-fd-dialog-in' : 'animate-fd-dialog-out',
          )}
        >
          {/* 内层必须撑满外层固定高度，flex 列才能正确把 overflow 交给 List */}
          <div className="flex flex-col h-full w-full p-3 lg:p-4 lg:w-(--ai-chat-width)">
            <AISearchPanelHeader />
            {panelView === 'history' ? (
              <div className="flex-1 min-h-0 pt-3">
                <AISearchHistoryPanel />
              </div>
            ) : (
              <>
                {/* min-h-0 防止 flex 子项撑破父容器 */}
                <AISearchPanelList className="flex-1 min-h-0" />
                <div className="shrink-0 flex flex-col gap-0">
                  <div className="rounded-xl border border-fd-border/80 bg-fd-secondary text-fd-secondary-foreground shadow-sm transition-shadow has-focus-visible:border-fd-primary/30 has-focus-visible:shadow-md">
                    <AISearchInput />
                  </div>
                  <AISearchPanelFooter />
                </div>
              </>
            )}
          </div>
        </div>
      </Presence>
    </>
  );
}
