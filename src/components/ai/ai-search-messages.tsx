'use client';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Ban, Bot, Check, CheckCircle2, ChevronDown, Clock, Copy, Loader2, RefreshCw, UserIcon } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { buttonVariants } from '@/components/ui/button';
import { DocsLink } from '@/components/docs/docs-link';
import type { ProvideLinksToolSchema } from '@/lib/ai/inkeep-qa-schema';
import type { z } from 'zod';
import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import { Markdown } from '@/components/docs/markdown';
import type { InkeepUIMessage } from '@/lib/ai/chat-types';
import { getExcerptToolExecutors } from '@/lib/docs/selection/excerpt-ai-tools-registry';
import { isExcerptClientToolName, type DeleteExcerptInput } from '@/lib/docs/selection/excerpt-ai-tools';
import { ExcerptDeleteConfirmPanel } from '@/components/docs/selection/excerpt-delete-confirm-panel';
import { idbGetHighlightById, type DocHighlight } from '@/lib/docs/selection/highlight-idb';
import { useAISearchContext } from '@/components/ai/ai-search-context';
import { AISearchWelcome } from '@/components/ai/ai-search-welcome';

/** 行内 code（排除 pre 代码块），字号略小于正文以协调等宽字体视觉偏大 */
const aiChatInlineCodeClass = cn(
  '[&_:not(pre)>code]:text-[13px] [&_:not(pre)>code]:leading-[1.35]',
  '[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-fd-muted/45 [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-px',
  '[&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none',
);

/** Scoped typography for assistant markdown (tables, code, headings). */
const aiChatMarkdownClass = cn(
  'prose prose-sm max-w-none min-w-0 w-full text-fd-foreground/95 text-[14px]',
  aiChatInlineCodeClass,
  '[&_.docs-table-scroll]:my-2.5 [&_.docs-table-scroll]:max-w-full [&_.docs-table-scroll]:overflow-x-auto',
  '[&_table]:border-collapse [&_table]:text-[12px] [&_table]:min-w-full [&_table]:w-max',
  '[&_thead]:border-b [&_thead]:border-fd-border',
  '[&_th]:bg-fd-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap',
  '[&_td]:border-b [&_td]:border-fd-border/50 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
  '[&_tr:last-child_td]:border-b-0',
  '[&_figure]:my-2.5 [&_figure]:max-w-full',
  '[&_p]:my-2 [&_p]:leading-relaxed',
  '[&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5',
  '[&_h1]:mb-2.5 [&_h1]:mt-0 [&_h1]:text-base [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-fd-border/70 [&_h2]:pb-1 [&_h2]:text-sm [&_h2]:font-semibold',
  '[&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-[14px] [&_h3]:font-semibold',
  '[&_blockquote]:border-fd-border [&_blockquote]:text-fd-muted-foreground',
  '[&_hr]:my-2 [&_hr]:border-fd-border/40',
);

/** 用户消息内的 markdown（全宽无气泡，与助手消息字号一致） */
const userMarkdownClass = cn(
  'prose prose-sm max-w-none min-w-0 w-full text-[14px]',
  aiChatInlineCodeClass,
  '[&_p]:my-1 [&_p]:leading-relaxed [&_p]:last:mb-0 [&_p]:first:mt-0',
  '[&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5',
  '[&_a]:underline',
);

function List({
  scrollToBottomKey,
  ...props
}: Omit<ComponentProps<'div'>, 'dir'> & {
  /** 变化时强制滚动到底部（如面板打开、切换会话） */
  scrollToBottomKey?: unknown;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** true = user has scrolled up, suppress auto-scroll */
  const userScrolledRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  // 监听用户手动上滚
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledRef.current = distFromBottom > 80;
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // 面板打开或切换会话时，强制重置并滚底
  useEffect(() => {
    userScrolledRef.current = false;
    scrollToBottom('instant');
  }, [scrollToBottomKey, scrollToBottom]);

  // 内容增长时（流式回复）自动跟随底部
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (userScrolledRef.current) return;
      scrollToBottom('instant');
    });

    // 观察直接子节点，子节点增高时触发
    const inner = container.firstElementChild;
    if (inner) observer.observe(inner);

    // 初始也滚一次
    scrollToBottom('instant');

    return () => observer.disconnect();
  }, [scrollToBottom]);

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

/** 将原始 AI SDK 错误转为用户可读的中文描述 */
function friendlyChatError(err: Error): string {
  const msg = err.message;
  if (/inference limit|rate.?limit|quota|limit.*reached/i.test(msg))
    return '模型调用次数已达上限，请稍后再试或在后台调整用量配置。';
  if (/unauthorized|invalid.*key|api.?key/i.test(msg))
    return 'API 密钥无效，请联系管理员检查配置。';
  if (/network|fetch.*fail|ECONNREFUSED|ETIMEDOUT/i.test(msg))
    return '网络连接失败，请检查网络后重试。';
  if (/5\d\d|server.?error|internal/i.test(msg))
    return '服务端异常，请稍后重试。';
  return msg;
}

function McpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-fd-primary', className)}
      aria-hidden
      fill="currentColor"
    >
      <path d="M555.736991 687.163569l261.990736-260.697107 0.616014-0.677615a50.513144 50.513144 0 0 0 12.320279-27.78223 51.067557 51.067557 0 0 0-6.16014-29.753474 52.422788 52.422788 0 0 0-80.081814-14.291524L481.938519 615.336341a95.235758 95.235758 0 0 1-43.120977 25.256572 96.590988 96.590988 0 0 1-50.081935 0.43121 95.112555 95.112555 0 0 1-43.120977-24.640558 93.018107 93.018107 0 0 1-24.640558-42.566564 91.601275 91.601275 0 0 1 0.800818-48.911509 92.402093 92.402093 0 0 1 26.057391-41.95055l263.037959-252.257715a50.944354 50.944354 0 0 0 14.969139-27.967034 50.205137 50.205137 0 0 0-4.620105-31.35511 51.498767 51.498767 0 0 0-22.361306-22.607712 52.54599 52.54599 0 0 0-31.478313-5.297721 51.560368 51.560368 0 0 0-28.644649 13.921916L275.635445 409.464477a195.399627 195.399627 0 0 0-55.441256 87.905192 192.504361 192.504361 0 0 0-1.971245 103.367141 194.906816 194.906816 0 0 0 51.745172 89.938038 200.204536 200.204536 0 0 0 91.046863 51.375564 203.284606 203.284606 0 0 0 104.722373-1.355231 199.280515 199.280515 0 0 0 89.999639-53.531612z" />
      <path d="M954.421224 307.452566a190.040306 190.040306 0 0 0-81.252241-83.654696 195.030019 195.030019 0 0 0-101.026289-22.97732 191.395536 191.395536 0 0 0-24.640558-101.08789 195.09162 195.09162 0 0 0-87.473982-80.513025 200.081333 200.081333 0 0 0-224.721892 37.392048l-8.747398 8.685796L65.266679 420.306323a50.821151 50.821151 0 0 0 13.2443 81.806653 52.176382 52.176382 0 0 0 31.539914 4.928112 51.129158 51.129158 0 0 0 28.459845-14.291524l369.916381-363.448235a94.065331 94.065331 0 0 1 49.773928-25.133369 95.605366 95.605366 0 0 1 55.441256 7.145762 93.14131 93.14131 0 0 1 41.457739 36.960837 90.677254 90.677254 0 0 1-7.268965 104.044758l-6.837754 7.145762-257.863443 252.565722-6.160139 6.960957-0.924021 1.170427a51.375564 51.375564 0 0 0-7.330566 18.049209l-0.369609 2.156049a50.32834 50.32834 0 0 0 0 17.186789 48.726704 48.726704 0 0 0 6.16014 16.139566l0.554412 0.985622 1.478434 2.340853a52.299585 52.299585 0 0 0 79.342598 7.638573l258.294652-253.181736 2.956867-2.895266a90.92366 90.92366 0 0 1 102.443121-13.429104 88.2748 88.2748 0 0 1 38.192865 37.576852 86.611562 86.611562 0 0 1-13.737111 99.79426l-363.448235 356.918487a50.697949 50.697949 0 0 0 0 72.504843l131.51898 129.36293 0.739217 0.677616a52.607592 52.607592 0 0 0 28.028635 11.765866h5.482524a52.237984 52.237984 0 0 0 24.640558-6.160139 51.375564 51.375564 0 0 0 21.62209-21.252482 50.821151 50.821151 0 0 0-6.16014-57.350899l-95.420561-93.264513 326.487397-320.696866a188.130662 188.130662 0 0 0 53.778018-102.997533 186.036215 186.036215 0 0 0-16.878782-114.578596z" />
    </svg>
  );
}

const toolDisplayName: Record<string, string> = {
  listDocumentationPages: '查看文档目录',
  searchDocumentationPages: '搜索文档',
  getDocumentationPageMeta: '读取页面元信息',
  getDocumentationPage: '读取文档内容',
  provideLinks: '引用链接',
  listExcerpts: '查看摘录',
  searchExcerpts: '搜索摘录',
  addExcerpt: '添加摘录',
  deleteExcerpt: '删除摘录',
};

const mcpAlias: Record<string, string> = {
  listDocumentationPages: 'list_docs',
  searchDocumentationPages: 'search_docs',
  getDocumentationPageMeta: 'get_docs_meta',
  getDocumentationPage: 'get_docs_content',
};

function formatToolPayload(value: unknown, maxLen: number): string {
  if (value === undefined || value === null) return '';
  const raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}\n...[已截断]`;
}

const EXCERPT_NOT_FOUND_MESSAGE = '未找到该摘录，可能已被删除';

function DeleteExcerptApprovalBlock({
  excerptId,
  toolCallId,
  approvalId,
}: {
  excerptId: string;
  toolCallId: string;
  approvalId: string;
}) {
  const { chat } = useAISearchContext();
  const { addToolOutput, addToolApprovalResponse } = chat;
  const [deleteTarget, setDeleteTarget] = useState<DocHighlight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoResolvedRef = useRef(false);

  const notFound = !loading && !deleteTarget && Boolean(error);

  useEffect(() => {
    let cancelled = false;

    void idbGetHighlightById(excerptId).then((highlight) => {
      if (cancelled) return;
      setDeleteTarget(highlight);
      setError(highlight ? null : EXCERPT_NOT_FOUND_MESSAGE);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [excerptId]);

  useEffect(() => {
    if (!notFound || autoResolvedRef.current) return;
    autoResolvedRef.current = true;

    void (async () => {
      await addToolApprovalResponse({
        id: approvalId,
        approved: false,
        reason: '摘录不存在',
      });
      await addToolOutput({
        tool: 'deleteExcerpt',
        toolCallId,
        output: JSON.stringify(
          {
            ok: false,
            error: 'Not found',
            message: EXCERPT_NOT_FOUND_MESSAGE,
            id: excerptId,
          },
          null,
          2,
        ),
      });
    })();
  }, [notFound, excerptId, approvalId, toolCallId, addToolApprovalResponse, addToolOutput]);

  const handleApproval = async (approved: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (approved) {
        const executors = getExcerptToolExecutors();
        if (!executors) {
          await addToolApprovalResponse({ id: approvalId, approved: false, reason: '摘录工具未就绪' });
          await addToolOutput({
            tool: 'deleteExcerpt',
            toolCallId,
            state: 'output-error',
            errorText: '摘录工具未就绪，请刷新页面后重试',
          });
          return;
        }
        const result = await executors.deleteExcerpt({ id: excerptId });
        await addToolApprovalResponse({ id: approvalId, approved: true });
        await addToolOutput({
          tool: 'deleteExcerpt',
          toolCallId,
          output: result,
        });
      } else {
        await addToolApprovalResponse({ id: approvalId, approved: false, reason: '用户取消' });
        await addToolOutput({
          tool: 'deleteExcerpt',
          toolCallId,
          state: 'output-error',
          errorText: '您取消了删除操作',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ExcerptDeleteConfirmPanel
      className="mt-2"
      variant={notFound ? 'not-found' : 'confirm'}
      highlight={deleteTarget}
      loading={loading}
      notFoundMessage={notFound ? `${error} 无需确认，将自动继续对话` : error}
      busy={busy}
      onConfirm={() => void handleApproval(true)}
      onCancel={() => void handleApproval(false)}
    />
  );
}

function ToolTraceCard({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const name = getToolName(part);
  const label = toolDisplayName[name] ?? name;
  const mcp = mcpAlias[name];
  const state = part.state;

  type StateIcon = { icon: ReactNode; title: string };
  const stateIconMap: Record<string, StateIcon> = {
    'input-streaming': {
      icon: <Loader2 className="size-3.5 animate-spin text-amber-500" />,
      title: '解析参数…',
    },
    'input-available': {
      icon: <Loader2 className="size-3.5 animate-spin text-amber-500" />,
      title: '即将执行',
    },
    'approval-requested': {
      icon: <Clock className="size-3.5 text-amber-500" />,
      title: '等待确认',
    },
    'approval-responded': {
      icon: <Clock className="size-3.5 text-amber-500" />,
      title: '已确认',
    },
    'output-available': {
      icon: <CheckCircle2 className="size-3.5 text-emerald-500" />,
      title: '已完成',
    },
    'output-error': {
      icon: <AlertCircle className="size-3.5 text-red-500" />,
      title: '执行失败',
    },
    'output-denied': {
      icon: <Ban className="size-3.5 text-fd-muted-foreground" />,
      title: '已拒绝',
    },
  };
  const stateIcon = stateIconMap[state];

  const input =
    'input' in part && part.input !== undefined ? (part.input as Record<string, unknown>) : undefined;
  const output = 'output' in part ? part.output : undefined;
  const errorText = 'errorText' in part ? part.errorText : undefined;
  const approval = 'approval' in part ? part.approval : undefined;

  const provideLinksInput = name === 'provideLinks' && input && 'links' in input ? input.links : null;

  const deleteInput =
    name === 'deleteExcerpt' && input && typeof input.id === 'string' ? (input as DeleteExcerptInput) : null;

  const showDeleteApproval = name === 'deleteExcerpt' && state === 'approval-requested' && deleteInput;

  // 是否有可展开的详情（调用参数 or 返回结果）
  const hasDetails =
    showDeleteApproval ||
    (input !== undefined && Object.keys(input).length > 0 && !showDeleteApproval) ||
    (state === 'output-available' && output !== undefined);

  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border border-fd-border bg-fd-muted/40 text-xs',
        state === 'output-error' && 'border-red-500/40 bg-red-500/5',
        showDeleteApproval && 'border-destructive/25 bg-destructive/[0.02]',
      )}
    >
      {/* 单行主体 */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5',
          hasDetails && 'cursor-pointer select-none',
        )}
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        {/* MCP 图标（左侧，仅 MCP 工具展示） */}
        {mcp ? (
          <span className="shrink-0 flex items-center gap-1 text-fd-primary" title="MCP 工具调用" aria-label="MCP">
            <McpIcon className="size-3.5" />
            <span className="text-[11px] font-medium">MCP</span>
          </span>
        ) : null}

        {/* 中文工具名 + 状态图标（紧靠在一起） */}
        <span className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden">
          <span className="truncate font-medium text-fd-foreground">{label}</span>
          {stateIcon ? (
            <span
              className="shrink-0 flex items-center"
              title={stateIcon.title}
              aria-label={stateIcon.title}
            >
              {stateIcon.icon}
            </span>
          ) : null}
        </span>

        {/* 展开/收起图标（靠右） */}
        {hasDetails ? (
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 text-fd-muted-foreground transition-transform duration-150',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        ) : null}
      </div>

      {/* 可展开的详情区 */}
      {expanded && hasDetails ? (
        <div className="border-t border-fd-border/50 px-2.5 pb-2.5 pt-2 flex flex-col gap-1.5">
          {input !== undefined && Object.keys(input).length > 0 && !showDeleteApproval ? (
            <div>
              <p className="mb-1 text-fd-muted-foreground">调用参数</p>
              <pre className="max-h-40 overflow-auto rounded-lg border border-fd-border/80 bg-fd-background p-2.5 font-mono text-[11px] leading-snug whitespace-pre-wrap wrap-break-word">
                {formatToolPayload(input, 8000)}
              </pre>
            </div>
          ) : null}
          {state === 'output-available' && output !== undefined ? (
            <div>
              <p className="mb-1 text-fd-muted-foreground">返回结果</p>
              <pre className="max-h-56 overflow-auto rounded-lg border border-fd-border/80 bg-fd-background p-2.5 font-mono text-[11px] leading-snug whitespace-pre-wrap wrap-break-word">
                {formatToolPayload(output, 12000)}
              </pre>
            </div>
          ) : null}
          {showDeleteApproval && deleteInput && approval ? (
            <DeleteExcerptApprovalBlock
              key={`${part.toolCallId}:${deleteInput.id}`}
              excerptId={deleteInput.id}
              toolCallId={part.toolCallId}
              approvalId={approval.id}
            />
          ) : null}
        </div>
      ) : null}

      {/* 错误信息（始终展示，不折叠） */}
      {errorText ? (
        <p className="border-t border-fd-border/50 px-2.5 py-2 text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word">
          {errorText}
        </p>
      ) : null}

      {/* provideLinks 引用链接（始终展示） */}
      {Array.isArray(provideLinksInput) && provideLinksInput.length > 0 ? (
        <div className="border-t border-fd-border/50 px-2.5 pb-2.5 pt-2 flex flex-row flex-wrap gap-1">
          {provideLinksInput.map((item: { url?: string; title?: string | null; label?: string | null }, i: number) =>
            item.url ? (
              <DocsLink
                key={i}
                href={item.url}
                className="block rounded-lg border bg-fd-card p-2 hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <p className="font-medium">{item.title ?? item.url}</p>
                {item.label != null ? (
                  <p className="text-fd-muted-foreground">参考 {item.label}</p>
                ) : null}
              </DocsLink>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

/** MM-DD HH:MM:SS 格式 */
function formatTime(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}:${ss}`;
}

function Message({ message, ...props }: { message: InkeepUIMessage } & ComponentProps<'div'>) {
  const { chat } = useAISearchContext();
  const { messages: allMessages, status, regenerate } = chat;
  const visibleMessages = allMessages.filter((m) => m.role !== 'system');
  const activeUserId = getActiveTurnUserId(visibleMessages, status);
  const isStreaming = status === 'streaming' || status === 'submitted';
  const showRetryOnUser =
    message.role === 'user' && (activeUserId === undefined || message.id !== activeUserId);
  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';
  const isActiveAssistant = isAssistant && isStreaming && message.id === visibleMessages.at(-1)?.id;

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 记录助手消息完成的时间戳：优先用服务端注入的 metadata.createdAt，否则在 streaming→ready 时锁定本地时间
  const metaCreatedAt =
    isAssistant && message.metadata?.createdAt
      ? new Date(message.metadata.createdAt)
      : null;
  const completedAtRef = useRef<Date | null>(
    isActiveAssistant ? null : (metaCreatedAt ?? new Date()),
  );
  const [completedAt, setCompletedAt] = useState<Date | null>(
    isActiveAssistant ? null : (metaCreatedAt ?? new Date()),
  );
  useEffect(() => {
    if (!isActiveAssistant && !completedAtRef.current) {
      const now = metaCreatedAt ?? new Date();
      completedAtRef.current = now;
      setCompletedAt(now);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveAssistant]);

  const segments: ReactNode[] = [];
  let textBuf = '';
  let linksFallback: z.infer<typeof ProvideLinksToolSchema>['links'] = [];

  const flushText = () => {
    if (textBuf.length === 0) return;
    segments.push(
      <div key={`md-${segments.length}`} className="min-w-0 -mx-0.5 overflow-x-auto px-0.5">
        <div className={isUser ? userMarkdownClass : aiChatMarkdownClass}>
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
  const showLegacyLinks = Boolean(linksFromParts?.length) && !hasProvideLinksToolPart;

  /** Plain text of the full assistant reply, used for copy */
  const plainText = (message.parts ?? [])
    .filter((p) => p.type === 'text')
    .map((p) => (p as { text: string }).text)
    .join('');

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = () => {
    void safeWriteClipboard(plainText).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isUser) {
    return (
      <div onClick={(e) => e.stopPropagation()} {...props} className={cn('flex flex-col gap-1.5', props.className)}>
        {/* 角色标签行 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-fd-muted-foreground">
            <UserIcon className="size-4" aria-hidden />
            <span>You</span>
          </div>
          {showRetryOnUser ? (
            <button
              type="button"
              title="重新生成该轮回复"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'sm',
                  className:
                    'h-5 shrink-0 gap-1 rounded-full px-2 text-[11px] font-normal leading-none text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
                }),
              )}
              onClick={() => void regenerate({ messageId: message.id })}
            >
              <RefreshCw className="size-3 shrink-0" aria-hidden />
              <span>重试</span>
            </button>
          ) : null}
        </div>
        {/* 消息内容（全宽无气泡） */}
        <div className="min-w-0 flex flex-col gap-1.5 pl-0.5">{segments}</div>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} {...props} className={cn('flex flex-col gap-1.5', props.className)}>
      {/* 角色标签行 */}
      <div className="flex items-center gap-2 text-sm font-semibold text-fd-primary">
        <Bot className="size-4" aria-hidden />
        <span>Assistant</span>
      </div>
      {/* 消息内容 */}
      <div className="min-w-0 flex-1 pl-0.5">
        <div className="flex flex-col gap-1.5">{segments}</div>

        {/* Legacy reference links */}
        {showLegacyLinks && linksFromParts ? (
          <div className="mt-2 flex flex-row flex-wrap items-center gap-1">
            {linksFromParts.map((item, i) => (
              <DocsLink
                key={i}
                href={item.url}
                className="block text-xs rounded-lg border p-3 hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-fd-muted-foreground">Reference {item.label}</p>
              </DocsLink>
            ))}
          </div>
        ) : null}

        {/* Footer: copy button + timestamp — only for completed assistant messages */}
        {!isActiveAssistant && plainText.length > 0 ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              title={copied ? '已复制' : '复制回答'}
              aria-label={copied ? '已复制' : '复制回答'}
              onClick={handleCopy}
              className={cn(
                'flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors',
                copied
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-fd-border bg-fd-background text-fd-muted-foreground hover:border-fd-border/80 hover:bg-fd-accent hover:text-fd-accent-foreground',
              )}
            >
              {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
              {copied ? '已复制' : '复制回答'}
            </button>
            {completedAt ? (
              <span className="text-[11px] text-fd-muted-foreground/60 tabular-nums">
                {formatTime(completedAt)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AISearchPanelList({ className, style, ...props }: ComponentProps<'div'>) {
  const { chat, bootError, chatError, persistedError, open, activeSessionId } = useAISearchContext();
  const messages = chat.messages.filter((msg) => msg.role !== 'system');

  // 优先展示运行时错误，其次展示持久化的历史错误（刷新后恢复）
  const displayError = chatError ?? (persistedError ? new Error(persistedError) : undefined);

  return (
    <List
      scrollToBottomKey={`${String(open)}-${activeSessionId}`}
      className={cn('py-4 overscroll-contain', className)}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)',
        ...style,
      }}
      {...props}
    >
      {bootError && (
        <div className="mx-1 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <p className="font-semibold">会话存储不可用</p>
          <p className="mt-0.5 opacity-80">对话记录将不会被保存。{bootError}</p>
        </div>
      )}
      {messages.length === 0 && !displayError ? (
        <AISearchWelcome />
      ) : (
        <div className="flex flex-col gap-5 px-1 sm:px-2 lg:px-1">
          {messages.map((item) => (
            <Message key={item.id} message={item} />
          ))}
          {displayError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
              <svg className="mt-px size-3.5 shrink-0 fill-current opacity-70" viewBox="0 0 16 16" aria-hidden>
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4.5h1.5v4h-1.5v-4Zm0 5h1.5v1.5h-1.5V10.5Z" />
              </svg>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">回复失败</p>
                <p className="mt-0.5 opacity-80">{friendlyChatError(displayError)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </List>
  );
}
