'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Card } from 'fumadocs-ui/components/card';
import { cn } from '@/lib/cn';
import { DoorOpen, PackagePlus, SquareMousePointer } from 'lucide-react';

export type ModuleCardProps = {
  /**
   * 与主标题同一行展示的小图标（可选）
   * - 不传入时：仅展示标题
   */
  icon?: ReactNode;
  /** 卡片主标题（建议为平台名/模块名） */
  title: string;
  /**
   * 副标题/补充说明（可选）
   */
  description?: ReactNode;
  /** 文档内跳转：`/` 开头为站内绝对路径；`./` 或无前导符为相对「当前文档所在目录」（不依赖地址栏是否带尾斜杠） */
  href: string;
  /** 模块标识（常用：PyPI 包名，如 rpa-conn-xxx-all；也可用于其它场景的唯一标识） */
  code: string;
  /** 平台/后台入口（可选） */
  url?: string;
  className?: string;
};

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

/**
 * 将 `./子页` 等相对 href 按「当前文档所在目录」解析，而不是按浏览器地址栏（无尾斜杠时整段会当作文件名被替换）。
 * 见：https://url.spec.whatwg.org/#url-constructor 对 base 为 .../a（无/）的解析。
 */
function resolveDocRelativeHref(href: string, pathname: string) {
  if (!href) return href;
  if (isExternalUrl(href)) return href;
  if (href.startsWith('/')) return href;
  const dir = pathname.endsWith('/') ? pathname : `${pathname}/`;
  try {
    return new URL(href, `https://_doc.local${dir}`).pathname;
  } catch {
    return href;
  }
}

export function ModuleCard({ icon, title, description, href, code, url, className }: ModuleCardProps) {
  const pathname = usePathname() ?? '/';
  const resolvedHref = href ? resolveDocRelativeHref(href, pathname) : href;

  return (
    <Card
      title={
        <span className="not-prose flex w-full min-w-0 items-center gap-2.5">
          {icon ? (
            <span
              className={cn(
                'not-prose inline-flex w-fit shrink-0 items-center justify-center',
                'rounded-lg border border-fd-border/70 bg-fd-muted p-1 text-fd-muted-foreground',
                'shadow-md shadow-black/5 dark:shadow-black/20',
                'transition-colors',
                'hover:bg-fd-accent/80',
                '[&_svg]:size-4',
              )}
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 text-[11px] font-bold leading-5 sm:text-base sm:leading-6">
            {title}
          </span>
        </span>
      }
      href={resolvedHref}
      className={cn('relative p-4 pr-12', className)}
    >
      {href ? (
        <button
          type="button"
          className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-fd-border/60 bg-fd-background/60 text-fd-muted-foreground shadow-sm hover:bg-fd-accent/80"
          aria-label="在新标签页打开文档"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const resolved = isExternalUrl(href)
              ? href
              : `${window.location.origin}${resolveDocRelativeHref(href, window.location.pathname)}`;
            window.open(resolved, '_blank', 'noopener,noreferrer');
          }}
        >
          <SquareMousePointer className="size-4" />
        </button>
      ) : null}

      <div className="not-prose space-y-3 text-sm text-fd-muted-foreground">
        {description ? (
          <div className="text-[12px] leading-5 text-fd-muted-foreground sm:text-sm sm:leading-6">
            &quot;{description}&quot;
          </div>
        ) : (
          <div className="h-2" aria-hidden />
        )}

        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-6 items-center justify-center rounded-md border border-fd-border/60 bg-fd-muted/30 text-fd-foreground"
            title="Code"
            aria-label="Code"
          >
            <PackagePlus className="size-3.5" />
          </span>
          <code className="min-w-0 flex-1 truncate rounded-md border border-fd-border/60 bg-fd-muted/40 px-2 py-1 font-mono text-[12px] font-bold text-fd-foreground">
            {code}
          </code>
        </div>

        {url ? (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex size-6 items-center justify-center rounded-md border border-fd-border/60 bg-fd-muted/30 text-fd-foreground"
              title="入口"
              aria-label="入口"
            >
              <DoorOpen className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              {isExternalUrl(url) ? (
                <button
                  type="button"
                  className={cn(
                    'group w-full text-left',
                    'rounded-md bg-fd-muted/30',
                    'hover:cursor-pointer',
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <span className="inline-flex w-full min-w-0 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate font-mono font-bold underline text-[13px] text-sky-700 dark:text-sky-200">
                      {url}
                    </span>
                  </span>
                </button>
              ) : (
                <span
                  className={cn(
                    'block w-full min-w-0 truncate rounded-md border border-fd-border/60 bg-fd-muted/30 px-2 py-1 font-mono text-[12px] text-fd-foreground',
                  )}
                >
                  {url}
                </span>
              )}
            </div>
          </div>
        ) : null}

      </div>
    </Card>
  );
}

