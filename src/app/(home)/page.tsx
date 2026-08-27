import Link from 'next/link';
import {
  BookOpenIcon,
  BotIcon,
  ChevronRightIcon,
  FileTextIcon,
  ServerCrash,
  Users,
  FanIcon,
  RssIcon,
  ServerIcon,
  SparklesIcon,
} from 'lucide-react';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';
import { DocsFloatingAnchors } from '@/components/docs/floating-anchors';
import { cn } from '@/lib/core/cn';
import { docsRoute, getSiteDescription, getSiteName } from '@/lib/core/shared';

const cards = [
  {
    href: `${docsRoute}/rpa`,
    icon: BotIcon,
    title: 'RPA 连接器',
    description:
      '通过自动化操作实现数据对接: 提前申请部署执行机环境、添加授权, 按需选择连接器即可执行; 推荐配置定时调度, 数据自动同步至资产表;',
  },
  {
    href: `${docsRoute}/api`,
    icon: ServerCrash,
    title: 'API 连接器(规划中)',
    description:
      '面向官方开放 API 的连接器(规划中): 通过预策自研 ISV 服务, 累计对接 1700+ 连接器, 搭配标准化数仓, 助力商家快速接入官方数据;',
  },
  {
    href: `${docsRoute}/auth`,
    icon: Users,
    title: '授权帮助',
    description:
      '授权帮助指南: 覆盖预策RPA、预策 ISV、商家自研三类流程, 帮助商家快速完成账号开通 / 服务订购 / 应用创建到授权添加的完整流程;',
  },
  {
    href: '/mcp/deeplink',
    icon: RssIcon,
    title: 'RSS & MCP 服务',
    description:
      '提供 RSS 订阅更新、 MCP 服务能力, 添加 MCP 服务到 Codex 或Claude Code, 即可在 AI 客户端中快速检索和访问文档内容。',
  },
] as const;

export default function HomePage() {
  const modelDisplayName = process.env.LLM_MODEL?.trim() || undefined;
  const siteName = getSiteName();
  const siteDescription = getSiteDescription();

  return (
    <AISearch modelDisplayName={modelDisplayName}>
      <AISearchPanel />
      <main className="flex min-h-0 flex-1 flex-col">
        <section className="relative flex flex-col items-center px-6 pt-16 pb-10 text-center sm:pt-20 sm:pb-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(ellipse 85% 55% at 50% -15%, hsla(221,83%,53%,0.12) 0%, transparent 65%)',
            }}
          />

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-secondary/90 px-3 py-1 text-xs font-medium text-fd-muted-foreground backdrop-blur-sm">
            <span className="inline-block size-1.5 rounded-full bg-fd-primary" />
            团队内部使用 · 禁止外部访问
          </div>

          <h1 className="max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight text-fd-foreground sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
            {siteName}
          </h1>

          <p className="mt-5 max-w-xl text-justify text-pretty text-sm leading-relaxed text-fd-muted-foreground sm:mt-6 sm:max-w-2xl sm:text-base">
            {siteDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10 sm:gap-3">
            <Link
              href={docsRoute}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-fd-primary px-6 text-sm font-semibold text-fd-primary-foreground shadow-md shadow-fd-primary/20 transition-[opacity,transform] hover:opacity-95 active:scale-[0.98]"
            >
              <BookOpenIcon className="size-4" />
              进入知识库
            </Link>
            <AISearchTrigger
              aria-label="有疑问找 AI"
              title="有疑问找 AI · 快捷键 ⌘ I 或 Ctrl + I"
              aria-keyshortcuts="Meta+KeyI Control+KeyI"
              className={cn(
                'group relative inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-medium sm:h-11 sm:px-5 sm:font-semibold',
                'border border-fd-primary/35 bg-fd-card/90 text-fd-primary shadow-sm backdrop-blur-sm',
                'dark:border-fd-primary/50 dark:bg-fd-muted/90 dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)]',
                'transition-all duration-300 ease-out',
                'hover:-translate-y-0.5 hover:border-fd-primary/60 hover:bg-linear-to-br hover:from-fd-primary/10 hover:to-violet-500/8 hover:shadow-md hover:shadow-fd-primary/12',
                'dark:hover:border-fd-primary/70 dark:hover:bg-fd-accent/60 dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.12)]',
                'active:translate-y-0 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background',
              )}
            >
              <span
                className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-transparent via-fd-primary/12 to-violet-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
                aria-hidden
              />
              <SparklesIcon
                className="size-4 shrink-0 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110 motion-reduce:transform-none"
                aria-hidden
              />
              <span className="whitespace-nowrap">有疑问找 AI</span>
              <span
                className="hidden items-center gap-0.5 border-l border-fd-primary/25 pl-2 text-[10px] font-normal tabular-nums text-fd-muted-foreground sm:inline-flex"
                aria-hidden
              >
                <kbd className="rounded border border-fd-border/90 bg-fd-muted/40 px-1 py-px font-sans dark:border-fd-border dark:bg-fd-background/60">
                  ⌘
                </kbd>
                <span className="opacity-70">+</span>
                <kbd className="min-w-4.5 rounded border border-fd-border/90 bg-fd-muted/40 px-1 py-px text-center font-sans dark:border-fd-border dark:bg-fd-background/60">
                  I
                </kbd>
              </span>
            </AISearchTrigger>
          </div>
        </section>

        <section className="flex flex-1 flex-col bg-linear-to-b from-transparent to-fd-muted/25 px-6 pb-6 pt-2 sm:pb-8 sm:pt-4">
          <div className="mx-auto w-full max-w-5xl flex-1">
            <div className="mb-5 text-center sm:mb-6">
              <h2 className="text-base font-semibold text-fd-foreground sm:text-lg">快速入口</h2>
              <p className="mx-auto mt-1 max-w-md text-pretty text-xs text-fd-muted-foreground sm:text-sm">
                RPA 连接器、API 连接器、授权帮助 — 按主题进入对应文档
              </p>
            </div>
            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-4 sm:items-start">
              {cards.map(({ href, icon: Icon, title, description }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group grid w-full grid-cols-[2rem_1fr] grid-rows-[auto_auto] gap-x-2.5 gap-y-0.5 rounded-xl border border-fd-border/80 bg-fd-card/80 p-3.5 text-left shadow-sm shadow-black/2 transition-[border-color,background-color,box-shadow] hover:border-fd-primary/35 hover:bg-fd-accent/25 hover:shadow-md dark:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background"
                  >
                    <span className="row-span-2 row-start-1 col-start-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-fd-accent/90 self-start ring-1 ring-fd-border/30">
                      <Icon className="size-4 text-fd-primary" aria-hidden />
                    </span>
                    <div className="row-start-1 col-start-2 flex min-w-0 items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-fd-foreground group-hover:text-fd-primary">
                        {title}
                      </p>
                      <ChevronRightIcon
                        className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-fd-primary"
                        aria-hidden
                      />
                    </div>
                    <p className="row-start-2 col-start-2 text-[13px] leading-snug text-fd-muted-foreground line-clamp-4 text-sm">
                      {description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mt-auto shrink-0 border-t border-fd-border/60 bg-fd-muted/10 py-5">
          <nav
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-xs text-fd-muted-foreground"
            aria-label="页脚链接"
          >
            <Link
              href={docsRoute}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 underline-offset-4 transition-colors hover:text-fd-foreground hover:underline"
            >
              <BookOpenIcon className="size-3.5 shrink-0 opacity-85" aria-hidden />
              查看知识库
            </Link>
            <span className="px-1 text-fd-border select-none" aria-hidden>
              |
            </span>
            <Link
              href="/rss.xml"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 underline-offset-4 transition-colors hover:text-fd-foreground hover:underline"
            >
              <RssIcon className="size-3.5 shrink-0 opacity-85" aria-hidden />
              RSS 订阅
            </Link>
            <span className="px-1 text-fd-border select-none" aria-hidden>
              |
            </span>
            <Link
              href="/mcp/deeplink"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 underline-offset-4 transition-colors hover:text-fd-foreground hover:underline"
            >
              <ServerIcon className="size-3.5 shrink-0 opacity-85" aria-hidden />
              MCP 服务
            </Link>
            <span className="px-1 text-fd-border select-none" aria-hidden>
              |
            </span>
            <Link
              href="/llms.txt"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 underline-offset-4 transition-colors hover:text-fd-foreground hover:underline"
            >
              <FileTextIcon className="size-3.5 shrink-0 opacity-85" aria-hidden />
              LLMs.txt
            </Link>
            <span className="px-1 text-fd-border select-none" aria-hidden>
              |
            </span>
            <Link
              href="/skills/SKILL.md"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 underline-offset-4 transition-colors hover:text-fd-foreground hover:underline"
            >
              <FanIcon className="size-3.5 shrink-0 opacity-85" aria-hidden />
              SKILL.md
            </Link>
          </nav>
        </footer>
      </main>
      <DocsFloatingAnchors />
    </AISearch>
  );
}
