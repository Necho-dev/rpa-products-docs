'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type SyntheticEvent,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  History,
  Loader2,
  MessageCircleIcon,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { buttonVariants } from '../ui/button';
import Link from 'fumadocs-core/link';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import type { ProvideLinksToolSchema } from '../../lib/ai/inkeep-qa-schema';
import type { z } from 'zod';
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
} from 'ai';
import { Markdown } from '../markdown';
import { Presence } from '@radix-ui/react-presence';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { buttonVariants as fdButtonVariants } from 'fumadocs-ui/components/ui/button';
import { Card } from 'fumadocs-ui/components/card';
import type { InkeepUIMessage } from '@/lib/ai-chat-types';
import type { SessionListItem } from '@/lib/ai-chat-idb';
import {
  deriveTitleFromMessages,
  idbBootstrap,
  idbCreateSession,
  idbDeleteSession,
  idbGetSession,
  idbListSessions,
  idbPutSession,
  idbSetActiveSessionId,
  formatChatSessionUpdatedAt,
} from '@/lib/ai-chat-idb';

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  chat: UseChatHelpers<InkeepUIMessage>;
  modelDisplayName?: string;
  /** IndexedDB 已就绪，可发送消息 */
  chatBooted: boolean;
  sessions: SessionListItem[];
  activeSessionId: string;
  newChatSession: () => Promise<void>;
  selectChatSession: (id: string) => Promise<void>;
  deleteChatSession: (id: string) => Promise<void>;
} | null>(null);

/** Scoped typography for assistant markdown (tables, code, headings). */
const aiChatMarkdownClass = cn(
  'prose prose-sm max-w-none min-w-0 w-full text-fd-foreground/95',
  '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]',
  '[&_thead]:border-b [&_thead]:border-fd-border',
  '[&_th]:bg-fd-muted/50 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap',
  '[&_td]:border-b [&_td]:border-fd-border/50 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top',
  '[&_tr:last-child_td]:border-b-0',
  '[&_figure]:my-3 [&_figure]:max-w-full',
  '[&_p]:my-2.5 [&_p]:leading-relaxed',
  '[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1',
  '[&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:text-lg [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-fd-border/70 [&_h2]:pb-1.5 [&_h2]:text-base [&_h2]:font-semibold',
  '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold',
  '[&_blockquote]:border-fd-border [&_blockquote]:text-fd-muted-foreground',
);

export function AISearchPanelHeader({ className, ...props }: ComponentProps<'div'>) {
  const { setOpen, sessions, activeSessionId, chatBooted, chat } = useAISearchContext();

  const headingTitle = useMemo(() => {
    if (!chatBooted) return 'Chat with AI';
    const visible = chat.messages.filter((m) => m.role !== 'system');
    const live = deriveTitleFromMessages(visible);
    if (live !== '新对话') return live;
    const meta = sessions.find((s) => s.id === activeSessionId);
    return meta?.title ?? '新对话';
  }, [chatBooted, chat.messages, sessions, activeSessionId]);

  const lastUpdatedText = useMemo(() => {
    if (!chatBooted) return null;
    const meta = sessions.find((s) => s.id === activeSessionId);
    if (!meta?.updatedAt) return null;
    return formatChatSessionUpdatedAt(meta.updatedAt);
  }, [chatBooted, sessions, activeSessionId]);

  return (
    <div
      className={cn(
        'sticky top-0 flex items-start gap-2 border rounded-xl bg-fd-secondary text-fd-secondary-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <div className="px-4 py-2.5 flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate" title={headingTitle}>
          {headingTitle}
        </p>
        {lastUpdatedText ? (
          <p className="text-xs text-fd-muted-foreground truncate">
            {lastUpdatedText}
          </p>
        ) : null}
      </div>

      <button
        aria-label="Close"
        tabIndex={-1}
        className={cn(
          buttonVariants({
            size: 'icon-sm',
            color: 'ghost',
            className: 'text-fd-muted-foreground rounded-full',
          }),
        )}
        onClick={() => setOpen(false)}
      >
        <X />
      </button>
    </div>
  );
}

export function AISearchSessionBar() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    chatBooted,
    sessions,
    activeSessionId,
    newChatSession,
    selectChatSession,
    deleteChatSession,
  } = useAISearchContext();

  if (!chatBooted) return null;

  const handlePick = (id: string) => {
    void (async () => {
      await selectChatSession(id);
      setHistoryOpen(false);
    })();
  };

  return (
    <div
      className="flex items-center justify-between gap-2 px-0.5 pb-2 pt-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
        <PopoverTrigger
          className={cn(
            fdButtonVariants({ color: 'secondary', size: 'sm' }),
            'h-9 max-w-[min(100%,240px)] shrink gap-2 rounded-full border border-fd-border/90 bg-fd-secondary/90 px-3 shadow-sm',
            'data-[state=open]:border-fd-primary/35 data-[state=open]:bg-fd-accent/80 data-[state=open]:text-fd-accent-foreground',
          )}
          aria-expanded={historyOpen}
          aria-haspopup="dialog"
          aria-label="打开历史会话"
        >
          <History className="size-4 shrink-0 text-fd-muted-foreground" aria-hidden />
          <span className="truncate text-xs font-medium">历史会话</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'flex min-h-0 w-[min(calc(100vw-2rem),320px)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-1',
          )}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-72 min-h-0 overflow-y-auto overscroll-contain fd-scroll-container p-1">
            {sessions.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-fd-muted-foreground">暂无会话</p>
            ) : (
              <ul className="flex flex-col gap-0.5 px-1">
                {sessions.map((s) => {
                  const active = s.id === activeSessionId;
                  return (
                    <li key={s.id}>
                      <div
                        className={cn(
                          'group flex items-start gap-1 rounded-lg px-2 py-2 transition-colors',
                          active
                            ? 'bg-fd-primary/12 ring-1 ring-fd-primary/25'
                            : 'hover:bg-fd-accent hover:text-fd-accent-foreground',
                        )}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-start"
                          onClick={() => handlePick(s.id)}
                        >
                          <span className="block truncate text-xs font-medium leading-snug">{s.title}</span>
                          <span className="mt-0.5 block text-[11px] text-fd-muted-foreground">
                            {formatChatSessionUpdatedAt(s.updatedAt)}
                          </span>
                        </button>
                        <button
                          type="button"
                          title="删除此会话"
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-md text-fd-muted-foreground',
                            'opacity-70 hover:bg-destructive/15 hover:text-destructive hover:opacity-100',
                          )}
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            if (
                              typeof window !== 'undefined' &&
                              window.confirm(`确定删除「${s.title}」？`)
                            ) {
                              void deleteChatSession(s.id).then(() => {
                                setHistoryOpen(false);
                              });
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
        </PopoverContent>
      </Popover>

      <button
        type="button"
        title="新建会话"
        aria-label="新建会话"
        className={cn(
          fdButtonVariants({ color: 'secondary', size: 'icon' }),
          'group h-9 w-9 shrink-0 rounded-full border border-fd-border/90 bg-fd-secondary/90 shadow-sm',
          'transition-[background-color,transform,box-shadow]',
          'hover:bg-fd-accent hover:shadow',
          'active:scale-[0.96]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-card',
        )}
        onClick={() => void newChatSession()}
      >
        <MessageSquarePlus
          className={cn(
            'size-[18px] transition-colors',
            'text-sky-600 dark:text-sky-400',
            'group-hover:text-violet-600 dark:group-hover:text-violet-400',
            'group-active:text-violet-700 dark:group-active:text-violet-300',
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function AISearchPanelFooter({ className, ...props }: ComponentProps<'div'>) {
  const { modelDisplayName, chatBooted } = useAISearchContext();

  if (!chatBooted || !modelDisplayName) return null;

  return (
    <div
      className={cn(
        'mt-2 px-1 text-[11px] leading-relaxed text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      <p className="text-xs text-fd-muted-foreground truncate" title={modelDisplayName}>
        回复内容由 <strong>{modelDisplayName}</strong> 提供
      </p>
    </div>
  );
}

const StorageKeyInput = '__ai_search_input';
export function AISearchInput(props: ComponentProps<'form'>) {
  const { status, sendMessage, stop } = useChatContext();
  const { chatBooted } = useAISearchContext();
  const [input, setInput] = useState(() => localStorage.getItem(StorageKeyInput) ?? '');
  const isLoading = status === 'streaming' || status === 'submitted';
  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (message.length === 0) return;

    void sendMessage({
      role: 'user',
      parts: [
        {
          type: 'data-client',
          data: {
            location: location.href,
          },
        },
        {
          type: 'text',
          text: message,
        },
      ],
    });
    setInput('');
    localStorage.removeItem(StorageKeyInput);
  };

  useEffect(() => {
    if (isLoading) document.getElementById('nd-ai-input')?.focus();
  }, [isLoading]);

  return (
    <form {...props} className={cn('flex items-start pe-2', props.className)} onSubmit={onStart}>
      <Input
        value={input}
        placeholder={isLoading ? 'AI is answering...' : 'Ask a question'}
        autoFocus
        className="p-3"
        disabled={!chatBooted || status === 'streaming' || status === 'submitted'}
        onChange={(e) => {
          setInput(e.target.value);
          localStorage.setItem(StorageKeyInput, e.target.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === 'Enter') {
            onStart(event);
          }
        }}
      />
      {isLoading ? (
        <button
          key="bn"
          type="button"
          className={cn(
            buttonVariants({
              color: 'secondary',
              className: 'transition-all rounded-full mt-2 gap-2',
            }),
          )}
          onClick={stop}
        >
          <Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
          Abort Answer
        </button>
      ) : (
        <button
          key="bn"
          type="submit"
          className={cn(
            buttonVariants({
              color: 'primary',
              className: 'transition-all rounded-full mt-2',
            }),
          )}
          disabled={!chatBooted || input.length === 0}
        >
          <Send className="size-4" />
        </button>
      )}
    </form>
  );
}

function List(props: Omit<ComponentProps<'div'>, 'dir'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** true = user has scrolled up, suppress auto-scroll */
  const userScrolledRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      // If user scrolled more than 80px from bottom, consider it intentional
      userScrolledRef.current = distFromBottom > 80;
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    function callback() {
      const container = containerRef.current;
      if (!container) return;
      if (userScrolledRef.current) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'instant',
      });
    }

    const observer = new ResizeObserver(callback);
    callback();

    const element = containerRef.current?.firstElementChild;

    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn('fd-scroll-container overflow-y-auto min-w-0 flex flex-col', props.className)}
    >
      {props.children}
    </div>
  );
}

function Input(props: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1', props.className);

  return (
    <div className="grid flex-1">
      <textarea
        id="nd-ai-input"
        {...props}
        className={cn(
          'resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none',
          shared,
        )}
      />
      <div ref={ref} className={cn(shared, 'break-all invisible')}>
        {`${props.value?.toString() ?? ''}\n`}
      </div>
    </div>
  );
}

const roleName: Record<string, string> = {
  user: 'You',
  assistant: 'Assistant',
};

/** 流式或提交中时，当前正在进行的「用户提问」对应的消息 id（用于隐藏该条上的重试） */
function getActiveTurnUserId(messages: InkeepUIMessage[], status: string): string | undefined {
  if (status !== 'streaming' && status !== 'submitted') return undefined;
  const last = messages.at(-1);
  if (!last) return undefined;
  if (last.role === 'assistant') {
    const prev = messages[messages.length - 2];
    return prev?.role === 'user' ? prev.id : undefined;
  }
  if (last.role === 'user') return last.id;
  return undefined;
}

const toolDisplayName: Record<string, string> = {
  listDocumentationPages: '查看文档目录',
  searchDocumentationPages: '搜索文档',
  getDocumentationPageMeta: '读取页面元信息',
  getDocumentationPage: '读取文档内容',
  provideLinks: '引用链接',
};

const mcpAlias: Record<string, string> = {
  listDocumentationPages: 'list-pages',
  searchDocumentationPages: 'search-docs',
  getDocumentationPageMeta: 'get-page-meta',
  getDocumentationPage: 'get-page',
};

function formatToolPayload(value: unknown, maxLen: number): string {
  if (value === undefined || value === null) return '';
  const raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}\n…（已截断）`;
}

function ToolTraceCard({
  part,
}: {
  part: ToolUIPart | DynamicToolUIPart;
}) {
  const name = getToolName(part);
  const label = toolDisplayName[name] ?? name;
  const mcp = mcpAlias[name];
  const state = part.state;

  const stateLabel: Record<string, string> = {
    'input-streaming': '解析参数…',
    'input-available': '即将执行',
    'approval-requested': '等待确认',
    'approval-responded': '已确认',
    'output-available': '已完成',
    'output-error': '执行失败',
    'output-denied': '已拒绝',
  };

  const input =
    'input' in part && part.input !== undefined
      ? (part.input as Record<string, unknown>)
      : undefined;
  const output = 'output' in part ? part.output : undefined;
  const errorText = 'errorText' in part ? part.errorText : undefined;

  const provideLinksInput = name === 'provideLinks' && input && 'links' in input ? input.links : null;

  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border border-fd-border bg-fd-muted/40 px-3 py-2.5 text-xs',
        state === 'output-error' && 'border-red-500/40 bg-red-500/5',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className="font-medium text-fd-foreground">{label}</span>
        {mcp ? (
          <span className="rounded bg-fd-secondary px-1.5 py-0.5 font-mono text-fd-muted-foreground">
            MCP: {mcp}
          </span>
        ) : null}
        <span
          className={cn(
            'rounded px-1.5 py-0.5',
            state === 'output-available' && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
            state === 'output-error' && 'bg-red-500/15 text-red-800 dark:text-red-200',
            (state === 'input-streaming' || state === 'input-available') &&
              'bg-amber-500/15 text-amber-900 dark:text-amber-100',
          )}
        >
          {stateLabel[state] ?? state}
        </span>
      </div>
      {input !== undefined && Object.keys(input).length > 0 ? (
        <details className="group/in mt-1">
          <summary className="cursor-pointer text-fd-muted-foreground hover:text-fd-foreground">
            调用参数
          </summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg border border-fd-border/80 bg-fd-background p-2.5 font-mono text-[11px] leading-snug whitespace-pre-wrap wrap-break-word">
            {formatToolPayload(input, 8000)}
          </pre>
        </details>
      ) : null}
      {state === 'output-available' && output !== undefined ? (
        <details className="group/in mt-1">
          <summary className="cursor-pointer text-fd-muted-foreground hover:text-fd-foreground">
            返回结果
          </summary>
          <pre className="mt-1 max-h-56 overflow-auto rounded-lg border border-fd-border/80 bg-fd-background p-2.5 font-mono text-[11px] leading-snug whitespace-pre-wrap wrap-break-word">
            {formatToolPayload(output, 12000)}
          </pre>
        </details>
      ) : null}
      {errorText ? (
        <p className="mt-1 text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word">{errorText}</p>
      ) : null}
      {Array.isArray(provideLinksInput) && provideLinksInput.length > 0 ? (
        <div className="mt-2 flex flex-row flex-wrap gap-1">
          {provideLinksInput.map((item: { url?: string; title?: string | null; label?: string | null }, i: number) =>
            item.url ? (
              <Link
                key={i}
                href={item.url}
                className="block rounded-lg border bg-fd-card p-2 hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <p className="font-medium">{item.title ?? item.url}</p>
                {item.label != null ? (
                  <p className="text-fd-muted-foreground">参考 {item.label}</p>
                ) : null}
              </Link>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

function Message({ message, ...props }: { message: InkeepUIMessage } & ComponentProps<'div'>) {
  const { messages: allMessages, status, regenerate } = useChatContext();
  const visibleMessages = allMessages.filter((m) => m.role !== 'system');
  const activeUserId = getActiveTurnUserId(visibleMessages, status);
  const isStreaming = status === 'streaming' || status === 'submitted';
  const showRetryOnUser =
    message.role === 'user' && (activeUserId === undefined || message.id !== activeUserId);
  const isAssistant = message.role === 'assistant';
  const isActiveAssistant = isAssistant && isStreaming && message.id === visibleMessages.at(-1)?.id;

  const [copied, setCopied] = useState(false);

  const segments: ReactNode[] = [];
  let textBuf = '';
  let linksFallback: z.infer<typeof ProvideLinksToolSchema>['links'] = [];

  const flushText = () => {
    if (textBuf.length === 0) return;
    segments.push(
      <div key={`md-${segments.length}`} className="min-w-0 -mx-0.5 overflow-x-auto px-0.5">
        <div className={aiChatMarkdownClass}>
          <Markdown text={textBuf} />
        </div>
      </div>,
    );
    textBuf = '';
  };

  for (const part of message.parts ?? []) {
    if (part.type === 'text') {
      textBuf += part.text;
      continue;
    }

    if (part.type === 'data-client') {
      continue;
    }

    if (part.type === 'tool-provideLinks' && 'input' in part && part.input) {
      linksFallback = (part.input as z.infer<typeof ProvideLinksToolSchema>).links;
    }

    if (isToolUIPart(part)) {
      flushText();
      segments.push(<ToolTraceCard key={part.toolCallId} part={part} />);
      continue;
    }

    flushText();
  }
  flushText();

  const linksFromParts = linksFallback;
  const hasProvideLinksToolPart = (message.parts ?? []).some(
    (p) => isToolUIPart(p) && getToolName(p) === 'provideLinks',
  );
  const showLegacyLinks =
    Boolean(linksFromParts?.length) && !hasProvideLinksToolPart;

  /** Plain text of the full assistant reply, used for copy */
  const plainText = (message.parts ?? [])
    .filter((p) => p.type === 'text')
    .map((p) => (p as { text: string }).text)
    .join('');

  const handleCopy = () => {
    void navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()} {...props}>
      {/* Header row */}
      <div
        className={cn(
          'mb-1 flex items-center justify-between gap-2 text-sm font-medium text-fd-muted-foreground',
          isAssistant && 'text-fd-primary',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isAssistant ? (
            <Bot className="size-4 shrink-0 text-fd-primary" aria-hidden />
          ) : message.role === 'user' ? (
            <User className="size-4 shrink-0 opacity-80" aria-hidden />
          ) : null}
          <span>{roleName[message.role] ?? 'unknown'}</span>
        </span>
        {showRetryOnUser ? (
          <button
            type="button"
            title="重新生成该轮回复"
            className={cn(
              buttonVariants({
                color: 'ghost',
                size: 'sm',
                className:
                  'h-7 shrink-0 gap-1 rounded-full px-2 text-xs font-normal text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
              }),
            )}
            onClick={() => void regenerate({ messageId: message.id })}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            重试
          </button>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2">{segments}</div>

      {/* Legacy reference links */}
      {showLegacyLinks && linksFromParts ? (
        <div className="mt-2 flex flex-row flex-wrap items-center gap-1">
          {linksFromParts.map((item, i) => (
            <Link
              key={i}
              href={item.url}
              className="block text-xs rounded-lg border p-3 hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-fd-muted-foreground">Reference {item.label}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Footer: copy button — only for completed assistant messages */}
      {isAssistant && !isActiveAssistant && plainText.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            title={copied ? '已复制' : '复制回答'}
            aria-label={copied ? '已复制' : '复制回答'}
            onClick={handleCopy}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
              copied
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-fd-border bg-fd-background text-fd-muted-foreground hover:border-fd-border/80 hover:bg-fd-accent hover:text-fd-accent-foreground',
            )}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {copied ? '已复制' : '复制回答'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AISearch({
  children,
  modelDisplayName,
}: {
  children: ReactNode;
  /** 与 `LLM_MODEL` 一致；须由服务端传入，客户端无法读取未公开的 env */
  modelDisplayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [seedMessages, setSeedMessages] = useState<InkeepUIMessage[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { activeId, messages } = await idbBootstrap();
      const list = await idbListSessions();
      if (cancelled) return;
      setSessionId(activeId);
      setSeedMessages(messages);
      setSessions(list);
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flushSession = useCallback(async (sid: string, messages: InkeepUIMessage[]) => {
    const title = deriveTitleFromMessages(messages);
    await idbPutSession({
      id: sid,
      title,
      updatedAt: Date.now(),
      messages,
    });
    setSessions(await idbListSessions());
  }, []);

  const chat = useChat<InkeepUIMessage>({
    id: booted ? sessionId : '__boot',
    messages: booted ? seedMessages : [],
    experimental_throttle: 64,
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: ({ messages }) => {
      void flushSession(sessionIdRef.current, messages);
    },
  });

  useEffect(() => {
    lastPersistRef.current = '';
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!booted || !sessionId) return;
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

  const newChatSession = useCallback(async () => {
    const id = await idbCreateSession();
    setSeedMessages([]);
    setSessionId(id);
    setSessions(await idbListSessions());
  }, []);

  const selectChatSession = useCallback(async (id: string) => {
    if (id === sessionIdRef.current) return;
    const rec = await idbGetSession(id);
    if (!rec) return;
    await idbSetActiveSessionId(id);
    setSeedMessages(rec.messages);
    setSessionId(id);
  }, []);

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

  const contextValue = useMemo(
    () => ({
      chat,
      open,
      setOpen,
      modelDisplayName,
      chatBooted: booted,
      sessions,
      activeSessionId: sessionId,
      newChatSession,
      selectChatSession,
      deleteChatSession,
    }),
    [
      chat,
      open,
      modelDisplayName,
      booted,
      sessions,
      sessionId,
      newChatSession,
      selectChatSession,
      deleteChatSession,
    ],
  );

  return <Context value={contextValue}>{children}</Context>;
}

export function AISearchTrigger({
  position = 'default',
  className,
  ...props
}: ComponentProps<'button'> & { position?: 'default' | 'float' }) {
  const { open, setOpen } = useAISearchContext();

  return (
    <button
      data-state={open ? 'open' : 'closed'}
      data-fd-ai-chat-float={position === 'float' ? '' : undefined}
      aria-label={position === 'float' ? '打开 AI 对话' : undefined}
      className={cn(
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
  const ctx = use(Context);
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

export function AISearchPanel() {
  const { open, setOpen } = useAISearchContext();
  useHotKey();

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
          className="fixed inset-0 z-30 backdrop-blur-xs bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out lg:hidden"
          onClick={() => setOpen(false)}
        />
      </Presence>
      <Presence present={open}>
        <div
          className={cn(
            /* 悬浮层，不占用任何布局空间 */
            'fixed z-40 overflow-hidden bg-fd-card text-fd-card-foreground shadow-2xl border rounded-2xl',
            '[--ai-chat-width:min(calc(100vw-1.25rem),640px)]',
            /* 小屏：铺满视口 */
            'max-lg:inset-x-1.5 max-lg:inset-y-3',
            /* 大屏：右下角浮窗；必须同时设 h（或 height）才能让内部 flex 列正确分配 */
            'lg:[--ai-chat-width:600px]',
            'lg:bottom-[max(4.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))]',
            'lg:inset-e-[max(1.25rem,calc(1.25rem+var(--removed-body-scroll-bar-size,0px)))]',
            /* 固定高度：默认 960px，视口不够时收缩，保底 400px */
            'lg:h-[min(960px,calc(100dvh-6rem))] lg:min-h-[400px]',
            open
              ? 'animate-fd-dialog-in'
              : 'animate-fd-dialog-out',
          )}
        >
          {/* 内层必须撑满外层固定高度，flex 列才能正确把 overflow 交给 List */}
          <div className="flex flex-col h-full w-full p-3 lg:p-4 lg:w-(--ai-chat-width)">
            <AISearchPanelHeader />
            {/* min-h-0 防止 flex 子项撑破父容器 */}
            <AISearchPanelList className="flex-1 min-h-0" />
            <div className="shrink-0 flex flex-col gap-0">
              <AISearchSessionBar />
              <div className="rounded-xl border bg-fd-secondary text-fd-secondary-foreground shadow-sm has-focus-visible:shadow-md">
                <AISearchInput />
              </div>
              <AISearchPanelFooter />
            </div>
          </div>
        </div>
      </Presence>
    </>
  );
}

export function AISearchPanelList({ className, style, ...props }: ComponentProps<'div'>) {
  const chat = useChatContext();
  const messages = chat.messages.filter((msg) => msg.role !== 'system');

  return (
    <List
      className={cn('py-4 overscroll-contain', className)}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)',
        ...style,
      }}
      {...props}
    >
      {messages.length === 0 ? (
        <div className="text-sm text-fd-muted-foreground/80 size-full flex flex-col items-center justify-center text-center gap-2">
          <MessageCircleIcon fill="currentColor" stroke="none" />
          <p onClick={(e) => e.stopPropagation()}>Start a new chat with AI.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-1 sm:px-2 lg:px-1">
          {messages.map((item) => (
            <Message key={item.id} message={item} />
          ))}
        </div>
      )}
    </List>
  );
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext();

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      e.preventDefault();
      return;
    }

    const isToggleShortcut =
      (e.metaKey || e.ctrlKey) &&
      (e.key === '/' || e.key === 'i' || e.key === 'I');

    if (isToggleShortcut) {
      setOpen(!open);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, []);
}

export function useAISearchContext() {
  return use(Context)!;
}

function useChatContext() {
  return use(Context)!.chat;
}
