'use client';
import { type ComponentProps, useMemo } from 'react';
import { ArrowLeft, History, MessageSquarePlus, X } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { buttonVariants } from '@/components/ui/button';
import { AskAIIcon } from '@/components/ai/ask-ai-icon';
import { deriveTitleFromMessages } from '@/lib/ai/chat-idb';
import { useAISearchContext } from '@/components/ai/ai-search-context';

const headerButtonClassName = cn(
  buttonVariants({
    size: 'icon-sm',
    color: 'ghost',
    className: 'text-fd-muted-foreground rounded-full',
  }),
);

export function AISearchPanelHeader({ className, ...props }: ComponentProps<'div'>) {
  const { setOpen, setPanelView, panelView, sessions, activeSessionId, chatBooted, chat, newChatSession } =
    useAISearchContext();

  const headingTitle = useMemo(() => {
    if (!chatBooted) return 'AI 对话';
    const visible = chat.messages.filter((m) => m.role !== 'system');
    const live = deriveTitleFromMessages(visible);
    if (live !== '新对话') return live;
    const meta = sessions.find((s) => s.id === activeSessionId);
    return meta?.title ?? '新对话';
  }, [chatBooted, chat.messages, sessions, activeSessionId]);

  return (
    <div
      className={cn(
        'sticky top-0 flex items-center gap-2 border rounded-xl bg-fd-secondary text-fd-secondary-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      {panelView === 'history' ? (
        <button
          aria-label="返回对话"
          className={headerButtonClassName}
          onClick={() => setPanelView('chat')}
        >
          <ArrowLeft />
        </button>
      ) : (
        <span className="ms-3 flex size-7 shrink-0 items-center justify-center rounded-full bg-fd-accent/70 text-fd-primary">
          <AskAIIcon className="size-4.5" />
        </span>
      )}

      <div className="min-w-0 flex-1 py-2.5">
        <p className="text-sm font-medium leading-snug truncate">
          {panelView === 'history' ? '消息列表' : headingTitle}
        </p>
      </div>

      {panelView === 'chat' ? (
        <>
          <button
            aria-label="新建对话"
            title="新建对话"
            className={headerButtonClassName}
            onClick={() => void newChatSession()}
          >
            <MessageSquarePlus />
          </button>
          <button
            aria-label="历史会话"
            title="历史会话"
            className={headerButtonClassName}
            onClick={() => setPanelView('history')}
          >
            <History />
          </button>
        </>
      ) : null}

      <button
        aria-label="Close"
        tabIndex={-1}
        className={cn(headerButtonClassName, 'me-1')}
        onClick={() => setOpen(false)}
      >
        <X />
      </button>
    </div>
  );
}
