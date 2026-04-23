import Link from 'next/link';
import {
  BookOpenIcon,
  BotIcon,
  ChevronRightIcon,
  FileTextIcon,
  LayersIcon,
  PackageIcon,
  RssIcon,
  ServerIcon,
  SparklesIcon,
} from 'lucide-react';
import { AISearch, AISearchPanel, AISearchTrigger } from '@/components/ai/search';
import { cn } from '@/lib/cn';
import { docsRoute, siteName } from '@/lib/shared';

const cards = [
  {
    href: `${docsRoute}/connectors`,
    icon: BotIcon,
    title: 'Connector 连接器',
    description:
      '定义具体业务逻辑的最小单元，一个任务类型对应一个连接器；遵循「1+1+N」开发模式，即 1 个新平台 = 1个登录组件 + N个连接器。',
  },
  {
    href: `${docsRoute}/components`,
    icon: LayersIcon,
    title: 'Component 组件',
    description:
      '可跨连接器复用的业务能力单元，Component 组件封装的是通用能力（比如常用的登录、验证码等），提供 @auth 装饰器支持声明式使用。',
  },
  {
    href: `${docsRoute}/apps`,
    icon: PackageIcon,
    title: 'App 应用',
    description:
      '具备通过 Git 仓库 / PyPI 包快速分发的能力，提供 deploy 脚本即可快速部署到执行机的 CLI 应用，提供完整的封装、部署 SOP 说明。',
  },
  {
    href: '/mcp/deeplink',
    icon: ServerIcon,
    title: 'RSS & MCP 服务',
    description:
      '提供原生 RSS 订阅更新、 MCP 服务能力，添加 MCP 服务到 Cursor、Claude Code，即可在 AI 客户端中快速检索和访问文档内容。',
  },
] as const;

export default function HomePage() {
  const modelDisplayName = process.env.LLM_MODEL?.trim() || undefined;

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

          <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-fd-muted-foreground sm:mt-6 sm:max-w-2xl sm:text-base">
            面向内部的 RPA 公共知识沉淀：收录 RPA 连接器数据模型、Component 可复用组件使用和 Apps
            应用部署说明。提供全文检索和 RSS 订阅，内置 AI 智能助手和 MCP 服务。
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
              title="快捷键：⌘ I 或 Ctrl + I 打开 / 关闭"
              aria-keyshortcuts="Meta+KeyI Control+KeyI"
              className={cn(
                'group relative inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-medium sm:h-11 sm:px-5 sm:font-semibold',
                'border border-fd-primary/35 bg-fd-card/90 text-fd-primary shadow-sm backdrop-blur-sm',
                'transition-all duration-300 ease-out',
                'hover:-translate-y-0.5 hover:border-fd-primary/60 hover:bg-linear-to-br hover:from-fd-primary/10 hover:to-violet-500/8 hover:shadow-md hover:shadow-fd-primary/12',
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
              <span className="whitespace-nowrap">Ask AI</span>
              <span
                className="hidden items-center gap-0.5 border-l border-fd-primary/25 pl-2 text-[10px] font-normal tabular-nums text-fd-muted-foreground sm:inline-flex"
                aria-hidden
              >
                <kbd className="rounded border border-fd-border/90 bg-fd-muted/40 px-1 py-px font-sans">⌘</kbd>
                <span className="opacity-70">+</span>
                <kbd className="min-w-4.5 rounded border border-fd-border/90 bg-fd-muted/40 px-1 py-px text-center font-sans">
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
                连接器、组件、应用与 MCP — 按主题进入对应文档
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
              LLMS
            </Link>
          </nav>
        </footer>
      </main>
    </AISearch>
  );
}
