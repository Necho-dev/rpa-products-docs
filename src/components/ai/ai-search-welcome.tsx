'use client';
import { BookOpenIcon, CircleCheckBig, FileTextIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { AskAIIcon } from '@/components/ai/ask-ai-icon';
import { useAISearchContext } from '@/components/ai/ai-search-context';

function resolvePageTitle(): string | null {
  if (typeof document === 'undefined') return null;
  const raw = document.title.trim();
  if (!raw) return null;
  // 站点 title 模板为 `%s | ${siteName}`，只去掉 `|` 后的站点名，勿按 `-` 分割（文档标题常含连字符）
  const title = raw.split(/\s*[|｜]\s*/)[0]?.trim();
  return title || null;
}

const quickPrompts = [
  {
    icon: BookOpenIcon,
    label: '帮我查找文档！',
    fillText: '我想查找「竞品对比」相关的文档，要告诉这些连接器都能提供哪些信息？',
    color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  },
  {
    icon: FileTextIcon,
    label: '当前页面讲什么？',
    fillText: () => {
      const title = resolvePageTitle();
      return title
        ? `请帮我概括「${title}」这篇文档的主要内容和重点，说明适合在什么场景下查阅，有哪些使用的注意事项。`
        : '请帮我概括当前打开的文档页面，说明主要内容和适用场景，有哪些使用的注意事项。';
    },
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  },
  {
    icon: CircleCheckBig,
    label: '连接器怎么选择？',
    fillText:
      '我选择有「拼多多推广数据分析」这样的需求，请帮我选择合适的连接器？请结合文档说明选型思路，举例说明不同场景下的推荐做法。',
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  },
  {
    icon: SparklesIcon,
    label: '说说你能做什么？',
    fillText: '你现在可以干些什么？请介绍一下你的能力范围，以及我可以怎样更高效地向你提问？',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  },
] as const;

export function AISearchWelcome() {
  const { chatBooted, fillInputDraft } = useAISearchContext();

  const handlePick = (fillText: string | (() => string)) => {
    if (!chatBooted) return;
    const draft = typeof fillText === 'function' ? fillText() : fillText;
    fillInputDraft(draft);
  };

  return (
    <div
      className="flex size-full flex-col items-center justify-center gap-5 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <span
          className="pointer-events-none absolute -inset-0.5 rounded-full bg-linear-to-br from-fd-primary/25 via-violet-500/15 to-sky-400/20 motion-reduce:opacity-50 dark:from-fd-primary/35 dark:via-violet-500/25 dark:to-sky-400/25"
          style={{ animation: 'ai-anchor-glow 3.2s ease-in-out infinite' }}
          aria-hidden
        />
        <div
          className={cn(
            'relative flex size-12 items-center justify-center rounded-full bg-fd-accent/60 text-fd-primary ring-1 ring-fd-border/60',
            'motion-reduce:animate-none',
            'animate-[ai-anchor-breathe_4s_ease-in-out_infinite,ai-anchor-float_5.5s_ease-in-out_infinite]',
          )}
        >
          <AskAIIcon className="size-9" />
        </div>
      </div>
      <p className="text-sm text-fd-muted-foreground">👋 Hi~ 我是文档助手，有什么可以帮你？</p>
      <div className="grid w-full max-w-[420px] grid-cols-2 gap-2 px-1">
        {quickPrompts.map(({ icon: Icon, label, fillText, color }) => (
          <button
            key={label}
            type="button"
            disabled={!chatBooted}
            onClick={() => handlePick(fillText)}
            className={cn(
              'flex items-center gap-2 rounded-full border border-fd-border/80 bg-fd-card/80 px-3 py-2 text-left text-xs font-medium text-fd-foreground shadow-sm',
              'transition-colors hover:border-fd-primary/35 hover:bg-fd-accent/60',
              'disabled:pointer-events-none disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-card',
            )}
          >
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', color)}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
