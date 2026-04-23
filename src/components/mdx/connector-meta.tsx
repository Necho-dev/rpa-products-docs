import Link from 'fumadocs-core/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BugPlay, ExternalLink, GitPullRequestArrow, Puzzle, UserLock, UserRoundKey, UserStar } from 'lucide-react';

/**
 * 依赖组件引用：
 * - 字符串：仍按 `rpa-comp-<type>-<name...>` 从包名推断文档路径（兼容旧 MDX）
 * - 对象：显式指定 `type` 或 `href`（最稳健；包名与文档布局解耦、避免歧义名）
 */
export type ConnectorComponentRef =
  | string
  | {
      pkg: string;
      /** 站点内绝对路径，须以 / 开头，例如 `/docs/components/login/rpa-comp-login-foo` */
      href?: string;
      /**
       * 文档目录里的一级分类（`content/docs/components/<type>/...` 中的 `<type>`）；
       * 与 `pkg` 组合为 `/docs/components/<type>/<pkg>`。若同时给 `href` 则忽略本字段
       */
      type?: string;
    };

function getComponentPkg(item: ConnectorComponentRef): string {
  return typeof item === 'string' ? item : item.pkg;
}

function componentDocHref(item: ConnectorComponentRef): string | undefined {
  const pkg = getComponentPkg(item);
  if (!pkg) return undefined;
  if (!pkg.startsWith('rpa-comp-')) return undefined;

  if (typeof item === 'object') {
    if (item.href) {
      const h = item.href.trim();
      if (h.startsWith('/')) return h;
      if (h.startsWith('docs/')) return `/${h}` as const;
    }
    if (item.type) {
      const seg = item.type.replace(/^\/+|\/+$/g, '');
      if (seg) return `/docs/components/${seg}/${encodeURIComponent(pkg)}` as const;
    }
  }

  // 约定回退：PyPI 包名形态为 rpa-comp-<type>-<name...>
  const m = /^rpa-comp-([^-]+)-(.+)$/.exec(pkg);
  if (m) return `/docs/components/${m[1]}/${encodeURIComponent(pkg)}` as const;

  return `/docs/components/${encodeURIComponent(pkg)}` as const;
}

function RowLabel({
  icon,
  iconWrapperClassName,
  children,
}: {
  icon: ReactNode;
  iconWrapperClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="inline-flex w-full max-w-full items-center gap-1.5 text-sm font-semibold text-fd-foreground">
      <span
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-fd-background/50',
          iconWrapperClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 leading-5">{children}</span>
    </div>
  );
}

const metaRowClassName =
  'grid grid-cols-1 gap-y-1.5 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-start sm:gap-x-2';

export function ConnectorMeta({
  platform,
  platformUrl,
  requireLogin = true,
  components,
  sdkConstraint = 'rpa-hero-sdk >=3.0.0',
  className,
}: {
  platform: string;
  platformUrl?: string;
  requireLogin?: boolean;
  /** PyPI 组件包名；可为字符串或带显式 `type`/`href` 的对象 */
  components: ConnectorComponentRef[];
  /** 依赖版本约束（例：rpa-hero-sdk >=3.0.0） */
  sdkConstraint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'not-prose my-4 rounded-xl border border-fd-border/60 bg-fd-card/40 p-3',
        'shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="text-base font-semibold text-fd-foreground">基础配置</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <div className={metaRowClassName}>
          <RowLabel
            iconWrapperClassName="border-emerald-500/20 bg-emerald-500/5"
            icon={<BugPlay className="size-3.5 text-emerald-700 dark:text-emerald-200" />}
          >
            适用平台
          </RowLabel>
          <div className="min-w-0 text-sm text-fd-foreground">
            <span className="font-medium">{platform}</span>
            {platformUrl ? (
              <>
                <span className="text-fd-muted-foreground">（</span>
                <a
                  className="break-all font-mono text-[12px] text-sky-700 underline decoration-fd-border/60 underline-offset-2 hover:decoration-sky-700 dark:text-sky-200"
                  href={platformUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {platformUrl}
                </a>
                <span className="text-fd-muted-foreground">）</span>
              </>
            ) : null}
          </div>
        </div>

        <div className={metaRowClassName}>
          <RowLabel
            iconWrapperClassName="border-amber-500/20 bg-amber-500/5"
            icon={<UserRoundKey className="size-3.5 text-amber-800 dark:text-amber-200" />}
          >
            登录约束
          </RowLabel>
          <div className="flex min-w-0 items-center gap-2 text-fd-foreground">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
                requireLogin
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-50'
                  : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50',
              )}
            >
              {requireLogin ? <UserLock className="size-3.5" /> : <UserStar className="size-3.5" />}
              {requireLogin ? '需要登录状态' : '不强制登录状态'}
            </span>
          </div>
        </div>

        <div className={metaRowClassName}>
          <RowLabel
            iconWrapperClassName="border-violet-500/20 bg-violet-500/5"
            icon={<Puzzle className="size-3.5 text-violet-800 dark:text-violet-200" />}
          >
            依赖组件
          </RowLabel>
          <div className="flex min-w-0 flex-wrap gap-2">
            {components.map((item, i) => {
              const pkg = getComponentPkg(item);
              const href = componentDocHref(item);
              if (!href) {
                return (
                  <code
                    key={`${i}-${pkg}`}
                    className="rounded-md border border-fd-border/60 bg-fd-muted/30 px-2 py-1 font-mono text-[12px] font-semibold"
                  >
                    {pkg}
                  </code>
                );
              }

              return (
                <Link
                  key={`${i}-${pkg}`}
                  href={href}
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-fd-border/60 bg-fd-background/50 px-2 py-1 font-mono text-[12px] font-semibold text-fd-foreground hover:bg-fd-accent/40"
                >
                  <span className="min-w-0 flex-1 truncate">{pkg}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-fd-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className={metaRowClassName}>
          <RowLabel
            iconWrapperClassName="border-sky-500/20 bg-sky-500/5"
            icon={<GitPullRequestArrow className="size-3.5 text-sky-800 dark:text-sky-200" />}
          >
            依赖版本
          </RowLabel>
          <div className="min-w-0">
            <code className="block w-fit max-w-full break-all rounded-md border border-fd-border/60 bg-fd-muted/30 px-2 py-1 font-mono text-[12px] font-semibold text-fd-foreground">
              {sdkConstraint}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
