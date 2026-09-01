'use client';
import {
  type ComponentProps,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/core/cn';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { Card } from 'fumadocs-ui/components/card';
import type { InkeepUIMessage } from '@/lib/ai/chat-types';
import { getExcerptToolExecutors } from '@/lib/docs/selection/excerpt-ai-tools-registry';
import { isExcerptClientToolName } from '@/lib/docs/selection/excerpt-ai-tools';
import { isOpenDocClientToolName } from '@/lib/docs/open-doc-ai-tools';
import type { SessionListItem } from '@/lib/ai/chat-idb';
import {
  deriveTitleFromMessages,
  idbBootstrap,
  idbCreateSession,
  idbDeleteSession,
  idbGetSession,
  idbListSessions,
  idbPutSession,
  idbSetActiveSessionId,
  idbSetDraftInput,
} from '@/lib/ai/chat-idb';
import {
  AISearchContext,
  type AISearchBackgroundNotify,
  type AISearchPanelView,
} from '@/components/ai/ai-search-context';

export { useAISearchContext } from '@/components/ai/ai-search-context';
export { useHotKey } from '@/components/ai/use-ai-hotkey';
export { AISearchPanel } from '@/components/ai/ai-search-panel';
export { AISearchPanelHeader } from '@/components/ai/ai-search-header';
export { AISearchHistoryPanel } from '@/components/ai/ai-search-history-panel';
export { AISearchWelcome } from '@/components/ai/ai-search-welcome';
export { AISearchPanelList } from '@/components/ai/ai-search-messages';
export { AISearchInput, AISearchPanelFooter } from '@/components/ai/ai-search-input';

export function AISearch({
  children,
  modelDisplayName,
}: {
  children: ReactNode;
  /** 页面展示名（`LLM_MODEL_DISPLAY` 优先，否则 `LLM_MODEL`）；须由服务端传入 */
  modelDisplayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<AISearchPanelView>('chat');
  const [backgroundNotify, setBackgroundNotify] = useState<AISearchBackgroundNotify>('idle');
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [persistedError, setPersistedError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [seedMessages, setSeedMessages] = useState<InkeepUIMessage[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectionContext, setSelectionContext] = useState<{
    text: string;
    pageUrl: string;
    pageTitle?: string;
  } | null>(null);
  const [inputSeed, setInputSeed] = useState<string | null>(null);
  const [inputSeedVersion, setInputSeedVersion] = useState(0);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const messagesRef = useRef<InkeepUIMessage[]>([]);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { activeId, messages, lastError } = await idbBootstrap();
        const list = await idbListSessions();
        if (cancelled) return;
        setSessionId(activeId);
        setSeedMessages(messages);
        setSessions(list);
        setPersistedError(lastError ?? null);
        setBooted(true);
      } catch (err) {
        if (cancelled) return;
        setBootError(err instanceof Error ? err.message : '存储初始化失败，对话记录可能无法保存');
        setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flushSession = useCallback(async (
    sid: string,
    messages: InkeepUIMessage[],
    lastError?: string | null,
  ) => {
    const title = deriveTitleFromMessages(messages);
    await idbPutSession({
      id: sid,
      title,
      updatedAt: Date.now(),
      messages,
      lastError: lastError ?? null,
    });
    setSessions(await idbListSessions());
  }, []);

  const addToolOutputRef = useRef<UseChatHelpers<InkeepUIMessage>['addToolOutput'] | null>(null);

  const runExcerptClientTool = useCallback(
    async (toolCall: { toolName: string; toolCallId: string; input: unknown }) => {
      const toolName = toolCall.toolName;
      if (!isExcerptClientToolName(toolName) || toolName === 'deleteExcerpt') return;

      const addToolOutput = addToolOutputRef.current;
      if (!addToolOutput) return;

      const executors = getExcerptToolExecutors();
      if (!executors) {
        await addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: '摘录工具未就绪，请刷新页面后重试。',
        });
        return;
      }

      try {
        const output = await executors[toolName](toolCall.input as never);
        await addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          output,
        });
      } catch (err) {
        await addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [],
  );

  const chat = useChat<InkeepUIMessage>({
    id: booted ? sessionId : '__boot',
    messages: booted ? seedMessages : [],
    experimental_throttle: 64,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    sendAutomaticallyWhen: ({ messages }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages }),
    onToolCall: ({ toolCall }) => {
      // onToolCall 在 Chat SerialJobExecutor 内同步触发；此处 await addToolOutput 会死锁并卡在「即将执行」。
      // deleteExcerpt / openDocumentationPage 需用户确认，不自动执行。
      if (isOpenDocClientToolName(toolCall.toolName)) return;
      void runExcerptClientTool(toolCall);
    },
    onFinish: ({ messages }) => {
      messagesRef.current = messages;
      setPersistedError(null);
      void flushSession(sessionIdRef.current, messages, null);
    },
    onError: (err) => {
      console.error('[AI Chat] 请求失败：', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setPersistedError(errMsg);
      const current = messagesRef.current;
      if (current.length > 0) {
        void flushSession(sessionIdRef.current, current, errMsg);
      }
    },
  });

  useEffect(() => {
    addToolOutputRef.current = chat.addToolOutput;
  }, [chat.addToolOutput]);

  useEffect(() => {
    lastPersistRef.current = '';
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!booted || !sessionId) return;
    // 实时同步最新消息到 ref，供 onError 回调使用
    messagesRef.current = chat.messages;
    const serialized = JSON.stringify(chat.messages);
    if (serialized === lastPersistRef.current) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      lastPersistRef.current = serialized;
      void flushSession(sessionId, chat.messages);
      persistTimerRef.current = null;
    }, 500);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [booted, sessionId, chat.messages, flushSession]);

  // 面板关闭期间生成结束（成功或失败）→ 短暂提示「回复已完成」，供右下角锚点动效使用
  const prevStatusRef = useRef(chat.status);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const wasBusy = prevStatus === 'submitted' || prevStatus === 'streaming';
    const isDone = chat.status === 'ready' || chat.status === 'error';
    if (!openRef.current && wasBusy && isDone) {
      setBackgroundNotify('completed');
      const timer = setTimeout(() => setBackgroundNotify('idle'), 3000);
      prevStatusRef.current = chat.status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = chat.status;
  }, [chat.status]);

  const newChatSession = useCallback(async () => {
    chat.stop();
    const id = await idbCreateSession();
    setSeedMessages([]);
    setPersistedError(null);
    setSessionId(id);
    setSessions(await idbListSessions());
  }, [chat]);

  const selectChatSession = useCallback(async (id: string) => {
    if (id === sessionIdRef.current) return;
    chat.stop();
    const rec = await idbGetSession(id);
    if (!rec) return;
    await idbSetActiveSessionId(id);
    setSeedMessages(rec.messages);
    setPersistedError(rec.lastError ?? null);
    setSessionId(id);
  }, [chat]);

  const deleteChatSession = useCallback(async (id: string) => {
    await idbDeleteSession(id);
    let list = await idbListSessions();
    if (id !== sessionIdRef.current) {
      setSessions(list);
      return;
    }
    if (list.length > 0) {
      const next = list[0];
      await idbSetActiveSessionId(next.id);
      const rec = await idbGetSession(next.id);
      setSeedMessages(rec?.messages ?? []);
      setSessionId(next.id);
    } else {
      const nid = await idbCreateSession();
      const rec = await idbGetSession(nid);
      setSeedMessages(rec?.messages ?? []);
      setSessionId(nid);
      list = await idbListSessions();
    }
    setSessions(list);
  }, []);

  const clearSelectionContext = useCallback(() => {
    setSelectionContext(null);
    setInputSeed(null);
  }, []);

  const openWithSelection = useCallback((ctx: {
    text: string;
    pageUrl: string;
    pageTitle?: string;
  }) => {
    setSelectionContext({
      text: ctx.text,
      pageUrl: ctx.pageUrl,
      pageTitle: ctx.pageTitle,
    });
    const draft = ctx.pageTitle
      ? `关于「${ctx.pageTitle}」中的这段内容，请帮我解释：\n\n> ${ctx.text}`
      : `请帮我解释以下内容：\n\n> ${ctx.text}`;
    setInputSeed(draft);
    setInputSeedVersion((v) => v + 1);
    void idbSetDraftInput(draft);
    setOpen(true);
    requestAnimationFrame(() => {
      document.getElementById('nd-ai-input')?.focus();
    });
  }, []);

  const fillInputDraft = useCallback((draft: string) => {
    setInputSeed(draft);
    setInputSeedVersion((v) => v + 1);
    void idbSetDraftInput(draft);
    requestAnimationFrame(() => {
      document.getElementById('nd-ai-input')?.focus();
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      chat,
      chatStatus: chat.status,
      open,
      setOpen,
      panelView,
      setPanelView,
      backgroundNotify,
      modelDisplayName,
      chatBooted: booted,
      bootError,
      chatError: chat.error,
      persistedError,
      sessions,
      activeSessionId: sessionId,
      newChatSession,
      selectChatSession,
      deleteChatSession,
      selectionContext,
      clearSelectionContext,
      openWithSelection,
      fillInputDraft,
      inputSeed,
      inputSeedVersion,
    }),
    [
      chat,
      open,
      panelView,
      backgroundNotify,
      modelDisplayName,
      booted,
      bootError,
      persistedError,
      sessions,
      sessionId,
      newChatSession,
      selectChatSession,
      deleteChatSession,
      selectionContext,
      clearSelectionContext,
      openWithSelection,
      fillInputDraft,
      inputSeed,
      inputSeedVersion,
    ],
  );

  return <AISearchContext value={contextValue}>{children}</AISearchContext>;
}

const circleTriggerClassName = cn(
  'relative flex size-11 items-center justify-center rounded-full overflow-hidden',
  'border border-fd-border/80 bg-fd-card/90 text-fd-primary shadow-lg backdrop-blur-sm',
  'dark:border-fd-border dark:bg-fd-muted dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] dark:ring-1 dark:ring-fd-primary/30',
  'transition-[transform,box-shadow,opacity] duration-300 ease-out',
  'hover:scale-105 hover:shadow-xl hover:shadow-fd-primary/15 hover:ring-2 hover:ring-fd-primary/25',
  'dark:hover:ring-fd-primary/45 dark:hover:shadow-[0_4px_24px_rgba(59,130,246,0.18)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background',
  'active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100',
);

export function AISearchTrigger({
  position = 'default',
  variant = 'default',
  className,
  ...props
}: ComponentProps<'button'> & {
  position?: 'default' | 'float' | 'anchor';
  variant?: 'default' | 'circle';
}) {
  const { open, setOpen } = use(AISearchContext)!;

  return (
    <button
      data-state={open ? 'open' : 'closed'}
      data-fd-ai-chat-float={position === 'float' ? '' : undefined}
      aria-label={
        position === 'float' || position === 'anchor' || variant === 'circle'
          ? '打开 AI 对话'
          : undefined
      }
      className={cn(
        variant === 'circle' && circleTriggerClassName,
        position === 'float' && [
          /* 视口右下角（inline-end = LTR 下右侧），与官方文档布局示意一致；避免无效 calc 导致定位失效 */
          'fixed z-40 flex flex-row items-center justify-center gap-2 shadow-lg transition-[translate,opacity]',
          'bottom-[max(5rem,env(safe-area-inset-bottom,0px))]',
          'inset-e-[max(5rem,calc(5rem+var(--removed-body-scroll-bar-size,0px)),env(safe-area-inset-end,0px))]',
          open && 'translate-y-10 opacity-0 pointer-events-none',
        ],
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
      type={props.type ?? 'button'}
    >
      {props.children}
    </button>
  );
}

/** 概览页等 MDX：点击卡片打开 Ask AI 侧栏（同 ⌘I / Ctrl+I 打开）。 */
export function AIChatOpenCard({
  icon,
  title,
  description,
  className,
}: Pick<ComponentProps<typeof Card>, 'icon' | 'title' | 'description' | 'className'>) {
  const ctx = use(AISearchContext);
  const enabled = ctx != null;

  return (
    <Card
      icon={icon}
      title={title}
      description={description}
      role={enabled ? 'button' : undefined}
      tabIndex={enabled ? 0 : undefined}
      aria-label={enabled && typeof title === 'string' ? `${title}（打开 Ask AI）` : undefined}
      className={cn(
        enabled && 'cursor-pointer select-none hover:bg-fd-accent/80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background',
        className,
      )}
      onClick={() => {
        ctx?.setOpen(true);
      }}
      onKeyDown={(e) => {
        if (!ctx) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx.setOpen(true);
        }
      }}
    />
  );
}
