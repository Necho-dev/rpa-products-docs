import { DocsLink } from '@/components/docs/docs-link';
import { PlatformFaviconImg } from '@/components/docs/mdx/platform-favicon-img';
import type { ReactNode } from 'react';
import { cn } from '@/lib/core/cn';
import { getCachedPlatformIcon } from '@/lib/docs/platform-favicon/lookup';
import {
  BookOpenText,
  BugPlay,
  ExternalLink,
  Link2,
  Package,
  UserLock,
  UserRoundKey,
  UserStar,
} from 'lucide-react';

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

export type ConnectorBadgeStat = {
  /** 文档 frontmatter 中的 badge.label，任意文案 */
  label: string;
  count: number;
  color?: string;
};

const UNLABELED_BADGE_LABEL = '未标注';
const DEFAULT_BADGE_DOT_COLOR = '#6366f1';

function BadgeStatPill({ label, count, color }: ConnectorBadgeStat) {
  const dotColor = color?.trim() || DEFAULT_BADGE_DOT_COLOR;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-fd-border/60 bg-fd-muted/20 px-2 py-1 text-xs font-semibold tabular-nums text-fd-foreground"
      title={`${label}：${count}`}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

export function MetaPanel({
  platform,
  platformUrl,
  requireLogin = true,
  authHelpUrl,
  connectorTotal,
  connectorBadgeStats,
  className,
}: {
  platform: string;
  platformUrl?: string;
  requireLogin?: boolean;
  /** 授权帮助文档链接；未配置时不展示该行 */
  authHelpUrl?: string;
  /** 同目录连接器总数（自动扫描） */
  connectorTotal?: number;
  /**
   * 按 frontmatter `badge.label` 原样聚合的分项数量。
   * 不限定「已上线 / 待上线」等固定枚举，任意 label 都会单独成组。
   */
  connectorBadgeStats?: ConnectorBadgeStat[];
  className?: string;
}) {
  const faviconUrl = getCachedPlatformIcon(platformUrl);
  const showConnectorStats =
    typeof connectorTotal === 'number' && connectorTotal >= 0;
  const badgeStats = connectorBadgeStats ?? [];
  /** 存在真实 badge.label（非「未标注」）时，总数进左侧标题，右侧只展示分项 */
  const labeledBadgeStats = badgeStats.filter(
    (stat) => stat.label !== UNLABELED_BADGE_LABEL,
  );
  const hasBadgeDesign = labeledBadgeStats.length > 0;
  const showAuthHelp = Boolean(authHelpUrl?.trim());

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
          <div className="text-base font-semibold text-fd-foreground">基础信息</div>
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
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-fd-foreground">
            {faviconUrl ? <PlatformFaviconImg src={faviconUrl} /> : null}
            <span className="font-medium">{platform}</span>
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
                className="inline-flex max-w-full items-center gap-1.5 break-all font-mono text-[12px] text-sky-700 underline decoration-fd-border/60 underline-offset-2 hover:decoration-sky-700 dark:text-sky-200"
                href={platformUrl}
              >
                <span className="min-w-0">{platformUrl}</span>
                <ExternalLink className="size-3.5 shrink-0 text-fd-muted-foreground" />
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

        {showConnectorStats ? (
          <div className={metaRowClassName}>
            <RowLabel
              iconWrapperClassName="border-violet-500/20 bg-violet-500/5"
              icon={<Package className="size-3.5 text-violet-800 dark:text-violet-200" />}
            >
              {hasBadgeDesign
                ? `连接器数量(${connectorTotal})`
                : '连接器数量'}
            </RowLabel>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {hasBadgeDesign ? (
                labeledBadgeStats.map((stat) => (
                  <BadgeStatPill key={stat.label} {...stat} />
                ))
              ) : (
                <span className="inline-flex items-center rounded-md border border-fd-border/60 bg-fd-muted/30 px-2 py-1 text-xs font-semibold tabular-nums text-fd-foreground">
                  共 {connectorTotal} 个
                </span>
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
            <div className="min-w-0">
              <DocsLink
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-sky-700 underline decoration-fd-border/60 underline-offset-2 hover:decoration-sky-700 dark:text-sky-200"
                href={authHelpUrl!.trim()}
              >
                查看授权帮助文档
                <ExternalLink className="size-3.5 shrink-0 text-fd-muted-foreground" />
              </DocsLink>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
