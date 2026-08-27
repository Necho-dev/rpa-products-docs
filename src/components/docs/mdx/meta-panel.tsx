import { DocsLink } from '@/components/docs/docs-link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/core/cn';
import { resolveDocIcon } from '@/lib/docs/icons/index';
import {
  BookOpenText,
  BugPlay,
  SquareArrowOutUpRight,
  Link2,
  ShieldCheck,
  UserLock,
  UserRoundKey,
  UserStar,
} from 'lucide-react';

/** 传给 MetaPanel 的已归一化登录方式项 */
export type MetaPanelLoginOption = {
  text: string;
  /** Lucide / platform / shared CODE；无则纯文本标签 */
  icon?: string;
  color?: string;
};

function EmptyValue() {
  return (
    <span className="text-xs font-medium text-fd-muted-foreground">无</span>
  );
}

function MetaValuePill({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-fd-border/60 bg-fd-muted/20 px-2 py-1 text-xs font-semibold text-fd-foreground',
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

function LoginOptionPill({ option }: { option: MetaPanelLoginOption }) {
  const iconName = option.icon?.trim();
  const iconEl = iconName ? resolveDocIcon(iconName) : undefined;
  const color = option.color?.trim();

  return (
    <MetaValuePill
      icon={
        iconEl ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center [&_svg]:size-3.5',
              !color && 'text-fuchsia-700 dark:text-fuchsia-300',
            )}
            style={color ? { color } : undefined}
          >
            {iconEl}
          </span>
        ) : undefined
      }
    >
      {option.text}
    </MetaValuePill>
  );
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
    <div className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-fd-foreground">
      <span
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-md border bg-fd-background/50 sm:size-7',
          iconWrapperClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 leading-5 whitespace-nowrap">{children}</span>
    </div>
  );
}

const metaRowClassName =
  'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-x-3';

export function MetaPanel({
  platform,
  platformUrl,
  icon,
  requireLogin = true,
  loginOptions,
  authHelpUrl,
  className,
}: {
  platform: string;
  platformUrl?: string;
  /** 图标名：platform icon / shared icon / Lucide（与 frontmatter `icon` 相同解析链） */
  icon?: string;
  requireLogin?: boolean;
  /** 登录方式标签；仅 `requireLogin` 为 true 时展示；空或未配置时展示「无」 */
  loginOptions?: MetaPanelLoginOption[];
  /** 授权帮助文档链接；未配置时不展示该行 */
  authHelpUrl?: string;
  className?: string;
}) {
  const platformIconEl = icon?.trim() ? resolveDocIcon(icon.trim()) : undefined;
  const showAuthHelp = Boolean(authHelpUrl?.trim());
  const loginOptionList = (loginOptions ?? []).filter((opt) =>
    Boolean(opt.text?.trim()),
  );

  return (
    <div
      className={cn(
        'not-prose my-4 rounded-xl border border-fd-border/60 bg-fd-card/40 p-2.5 sm:p-3',
        'shadow-sm',
        className,
      )}
    >
      <div className="text-sm font-semibold text-fd-foreground sm:text-base">
        基础信息
      </div>

      <div className="mt-2.5 grid gap-1.5 text-sm sm:mt-3 sm:gap-2">
        <div className={metaRowClassName}>
          <RowLabel
            iconWrapperClassName="border-emerald-500/20 bg-emerald-500/5"
            icon={<BugPlay className="size-3.5 text-emerald-700 dark:text-emerald-200" />}
          >
            适用平台
          </RowLabel>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-fd-foreground">
            {platformIconEl ? (
              <span className="inline-flex shrink-0 items-center [&_svg]:size-4.5">
                {platformIconEl}
              </span>
            ) : null}
            <span className="min-w-0 truncate font-medium">{platform}</span>
          </div>
        </div>

        {platformUrl ? (
          <div className={metaRowClassName}>
            <RowLabel
              iconWrapperClassName="border-sky-500/20 bg-sky-500/5"
              icon={<Link2 className="size-3.5 text-sky-800 dark:text-sky-200" />}
            >
              平台主页
            </RowLabel>
            <div className="min-w-0">
              <DocsLink
                className="inline-flex max-w-full items-center gap-1.5 font-mono text-[13px] text-sky-700 underline decoration-fd-border/60 underline-offset-2 hover:decoration-sky-700 dark:text-sky-200"
                href={platformUrl}
                title={platformUrl}
              >
                <span className="min-w-0 truncate">{platformUrl}</span>
                <SquareArrowOutUpRight className="size-3.5 shrink-0 text-fd-muted-foreground" />
              </DocsLink>
            </div>
          </div>
        ) : null}

        <div className={metaRowClassName}>
          <RowLabel
            iconWrapperClassName="border-amber-500/20 bg-amber-500/5"
            icon={<UserRoundKey className="size-3.5 text-amber-800 dark:text-amber-200" />}
          >
            登录依赖
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
              {requireLogin ? '需要登录状态' : '无需登录状态'}
            </span>
          </div>
        </div>

        {requireLogin ? (
          <div className={metaRowClassName}>
            <RowLabel
              iconWrapperClassName="border-fuchsia-500/20 bg-fuchsia-500/5"
              icon={<ShieldCheck className="size-3.5 text-fuchsia-800 dark:text-fuchsia-200" />}
            >
              登录方式
            </RowLabel>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {loginOptionList.length === 0 ? (
                <EmptyValue />
              ) : (
                loginOptionList.map((option, index) => (
                  <LoginOptionPill
                    key={`${option.text}-${option.icon ?? ''}-${index}`}
                    option={option}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}

        {showAuthHelp ? (
          <div className={metaRowClassName}>
            <RowLabel
              iconWrapperClassName="border-rose-500/20 bg-rose-500/5"
              icon={<BookOpenText className="size-3.5 text-rose-800 dark:text-rose-200" />}
            >
              授权帮助
            </RowLabel>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <DocsLink
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-sky-700 underline decoration-fd-border/60 underline-offset-2 hover:decoration-sky-700 dark:text-sky-200"
                href={authHelpUrl!.trim()}
              >
                <span className="min-w-0 truncate">查看授权帮助文档</span>
                <SquareArrowOutUpRight className="size-3.5 shrink-0 text-fd-muted-foreground" />
              </DocsLink>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
