'use client';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { formatChatSessionUpdatedAt, MAX_SESSIONS } from '@/lib/ai/chat-idb';
import { useAISearchContext } from '@/components/ai/ai-search-context';

export function AISearchHistoryPanel() {
  const { sessions, activeSessionId, selectChatSession, deleteChatSession, setPanelView } =
    useAISearchContext();

  const handlePick = (id: string) => {
    void (async () => {
      await selectChatSession(id);
      setPanelView('chat');
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 px-1" onClick={(e) => e.stopPropagation()}>
      {sessions.length > 0 ? (
        <p className="px-2 pt-1 text-xs font-medium text-fd-muted-foreground">更早对话</p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain fd-scroll-container">
        {sessions.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-fd-muted-foreground">暂无会话</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sessions.map((s) => {
              const active = s.id === activeSessionId;
              return (
                <li key={s.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-1 rounded-lg px-2 py-2.5 transition-colors',
                      active
                        ? 'bg-fd-primary/12 ring-1 ring-fd-primary/25'
                        : 'hover:bg-fd-accent hover:text-fd-accent-foreground',
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                      onClick={() => handlePick(s.id)}
                    >
                      <span className="truncate text-sm font-medium leading-snug">{s.title}</span>
                    </button>
                    <span className="shrink-0 text-xs text-fd-muted-foreground">
                      {formatChatSessionUpdatedAt(s.updatedAt)}
                    </span>
                    <button
                      type="button"
                      title="删除此会话"
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md text-fd-muted-foreground',
                        'opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive',
                      )}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (
                          typeof window !== 'undefined' &&
                          window.confirm(`确定删除「${s.title}」？`)
                        ) {
                          void deleteChatSession(s.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="shrink-0 pb-1 pt-1 text-center text-[11px] text-fd-muted-foreground/70">
        只保留近 {MAX_SESSIONS} 次对话记录
      </p>
    </div>
  );
}
