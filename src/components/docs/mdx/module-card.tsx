'use client';

import Link from 'fumadocs-core/link';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useOpenDocsHref } from '@/components/docs/docs-link';
import { DocsHoverToolbar } from '@/components/docs/docs-hover-toolbar';
import { Check, Copy, Globe, ImageOff, Loader2, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { ConnectorScheduleChips } from '@/components/docs/connector-schedule-panel';
import {
  hasScheduleMeta,
  type DataReadyMeta,
  type EstimatedDurationMeta,
  type MinIntervalMeta,
} from '@/lib/docs/format-schedule-meta';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';
import { useModuleCoverImage } from '@/components/docs/mdx/use-module-cover-image';

export type ModuleCardBadge = {
  label: string;
  color?: string;
};

export type ModuleCardProps = {
  /** 与主标题同一行展示的小图标（可选，用于 connectors/index 等手写页） */
  icon?: ReactNode;
  /** 站内平台 favicon；加载失败时回退到 icon */
  faviconUrl?: string;
  /** 卡片主标题 */
  title: string;
  /** 子文档 description，最多展示 2 行 */
  description?: string;
  /** 文档内跳转 */
  href: string;
  /** 子文档 entry; 未定义时不展示底部技术码 */
  code?: string;
  /** 状态徽标（任意 label / color，由文档 frontmatter 决定） */
  badge?: ModuleCardBadge;
  /** 平台/后台入口（可选，用于 connectors/index 等手写页） */
  url?: string;
  /** 卡片封面 OG（cover.png） */
  coverUrl?: string;
  /** 数据就绪（周期 + 时间） */
  dataReady?: DataReadyMeta;
  /** 预估执行耗时 */
  estimatedDuration?: EstimatedDurationMeta;
  /** 最小调度间隔 */
  minInterval?: MinIntervalMeta;
  /** 搜索命中高亮（已规范化小写 query） */
  highlightQuery?: string;
  /** 有图标时才占位；未定义不留空槽 */
  reserveIcon?: boolean;
  className?: string;
};

const SEARCH_MARK_CLASS =
  'rounded-[1px] bg-[#ffe566] p-0 text-inherit dark:bg-yellow-500/45';

export function highlightQueryText(
  text: string | undefined,
  normalizedQuery: string | undefined,
): ReactNode {
  if (!text) return text;
  if (!normalizedQuery) return text;

  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let start = 0;
  let index = lower.indexOf(normalizedQuery, start);
  let key = 0;
  if (index < 0) return text;

  while (index >= 0) {
    if (index > start) parts.push(text.slice(start, index));
    parts.push(
      <mark key={`m-${key++}`} className={SEARCH_MARK_CLASS}>
        {text.slice(index, index + normalizedQuery.length)}
      </mark>,
    );
    start = index + normalizedQuery.length;
    index = lower.indexOf(normalizedQuery, start);
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

function ModuleCardTitleIcon({
  faviconUrl,
  icon,
  reserve,
}: {
  faviconUrl?: string;
  icon?: ReactNode;
  reserve?: boolean;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showFavicon = Boolean(faviconUrl) && !faviconFailed;

  if (!showFavicon && !icon && !reserve) return null;

  return (
    <span
      className={cn(
        'inline-flex size-10 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-xl border border-fd-border/70 bg-fd-muted p-1.5 text-fd-muted-foreground',
        '[&_img]:size-full [&_img]:object-contain [&_svg]:size-full',
      )}
    >
      {showFavicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
          className="size-full object-contain"
          onError={() => setFaviconFailed(true)}
        />
      ) : (
        icon
      )}
    </span>
  );
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function ModuleCardLink({
  href,
  className,
  children,
  ...props
}: {
  href: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}) {
  const openDocs = useOpenDocsHref({ onlyWhenSplit: true });
  return (
    <Link
      href={href}
      className={className}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => openDocs(href, e)}
      {...props}
    >
      {children}
    </Link>
  );
}

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

function ModuleCardBadgePill({ label, color }: ModuleCardBadge) {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none text-fd-card"
      style={{ backgroundColor: color ?? '#6366f1' }}
    >
      {label}
    </span>
  );
}

function EntryCopyButton({ value }: { value: string }) {
  const [copied, onCopy] = useCopyButton(() => void safeWriteClipboard(value));

  return (
    <button
      type="button"
      aria-label={copied ? '已复制' : '复制 Entry'}
      title={copied ? '已复制' : '复制 Entry'}
      data-checked={copied || undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCopy(e);
      }}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-md',
        'text-fd-muted-foreground transition-colors',
        'hover:bg-fd-accent hover:text-fd-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function ModuleCardCoverSkeleton({ phase }: { phase: 'idle' | 'loading' | 'error' }) {
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden bg-fd-muted/25',
        phase === 'loading' && 'animate-pulse',
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-linear-to-br from-fd-muted/30 via-fd-background/90 to-fd-muted/15 dark:from-fd-muted/15 dark:via-fd-background/95 dark:to-fd-muted/10" />
      <div
        className="absolute inset-0 opacity-30 dark:opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-fd-border) 55%, transparent) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />
      {phase === 'loading' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-fd-muted-foreground/60" />
          <span className="text-[11px] text-fd-muted-foreground/70">正在加载封面…</span>
        </div>
      ) : null}
      {phase === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <ImageOff className="size-4 text-fd-muted-foreground/55" />
          <span className="text-[10px] text-fd-muted-foreground/65">封面加载失败</span>
        </div>
      ) : null}
    </div>
  );
}

function ModuleCardCover({
  coverUrl,
  href,
  resolvedHref,
  title,
}: {
  coverUrl: string;
  href: string;
  resolvedHref: string;
  title: string;
}) {
  const { containerRef, src, status, onLoad, onError } = useModuleCoverImage(coverUrl);

  const frameClassName =
    'relative mb-3 aspect-video w-full overflow-hidden rounded-lg border border-fd-border/50 bg-fd-muted/15';

  const content = (
    <div ref={containerRef} className={frameClassName}>
      {status !== 'loaded' ? (
        <ModuleCardCoverSkeleton
          phase={status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'idle'}
        />
      ) : null}
      {src && status !== 'error' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          decoding="async"
          fetchPriority="low"
          onLoad={onLoad}
          onError={onError}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <ModuleCardLink
      href={resolvedHref}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-fd-ring rounded-lg"
      aria-label={title}
    >
      {content}
    </ModuleCardLink>
  );
}

function ModuleCardScheduleLine({
  dataReady,
  estimatedDuration,
  minInterval,
}: {
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
}) {
  if (
    !hasScheduleMeta({
      dataReady,
      estimatedDuration,
      minInterval,
    })
  ) {
    return null;
  }

  return (
    <ConnectorScheduleChips
      dataReady={dataReady}
      estimatedDuration={estimatedDuration}
      minInterval={minInterval}
      className="mt-2"
    />
  );
}

function ModuleCardHeader({
  icon,
  faviconUrl,
  title,
  description,
  badge,
  href,
  resolvedHref,
  dataReady,
  estimatedDuration,
  minInterval,
  highlightQuery,
  reserveIcon,
}: {
  icon?: ReactNode;
  faviconUrl?: string;
  title: string;
  description?: string;
  badge?: ModuleCardBadge;
  href: string;
  resolvedHref: string;
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
  highlightQuery?: string;
  reserveIcon?: boolean;
}) {
  const content = (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        <ModuleCardTitleIcon
          faviconUrl={faviconUrl}
          icon={icon}
          reserve={reserveIcon}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="min-w-0 flex-1 truncate text-sm font-bold text-fd-foreground"
              title={title}
            >
              {highlightQueryText(title, highlightQuery)}
            </h3>
            {badge ? <ModuleCardBadgePill {...badge} /> : null}
          </div>
          <p className="mt-1.5 line-clamp-2 min-h-[2lh] text-xs leading-relaxed text-fd-muted-foreground">
            {description
              ? highlightQueryText(description, highlightQuery)
              : null}
          </p>
        </div>
      </div>
      <ModuleCardScheduleLine
        dataReady={dataReady}
        estimatedDuration={estimatedDuration}
        minInterval={minInterval}
      />
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <ModuleCardLink
      href={resolvedHref}
      className="block min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
    >
      {content}
    </ModuleCardLink>
  );
}

export function ModuleCard({
  icon,
  faviconUrl,
  title,
  description,
  href,
  code,
  badge,
  url,
  coverUrl,
  dataReady,
  estimatedDuration,
  minInterval,
  highlightQuery,
  reserveIcon,
  className,
}: ModuleCardProps) {
  const pathname = usePathname() ?? '/';
  const resolvedHref = href ? resolveDocRelativeHref(href, pathname) : href;

  const cardClassName = cn(
    'group/card relative not-prose col-span-1 flex h-full flex-col overflow-visible rounded-xl border border-fd-border/60 bg-fd-card p-4',
    'text-fd-card-foreground shadow-sm transition-colors @max-lg:col-span-1',
    href && 'hover:z-20 hover:border-fd-border hover:bg-fd-accent/40',
    className,
  );

  return (
    <div className={cardClassName}>
      {href ? (
        <DocsHoverToolbar href={resolvedHref} ariaLabel="连接器快捷操作" />
      ) : null}
      {coverUrl ? (
        <ModuleCardCover
          coverUrl={coverUrl}
          href={href}
          resolvedHref={resolvedHref}
          title={title}
        />
      ) : null}
      <ModuleCardHeader
        icon={icon}
        faviconUrl={faviconUrl}
        title={title}
        description={description}
        badge={badge}
        href={href}
        resolvedHref={resolvedHref}
        dataReady={dataReady}
        estimatedDuration={estimatedDuration}
        minInterval={minInterval}
        highlightQuery={highlightQuery}
        reserveIcon={reserveIcon}
      />

      {(code || url) ? (
        <div className="mt-auto space-y-2 pt-3">
          {code ? (
            <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-fd-border/60 bg-fd-muted/30 px-2 py-1">
              <span
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-fd-border/60 bg-fd-muted/40 text-fd-muted-foreground"
                title="Entry"
                aria-hidden
              >
                <PackagePlus className="size-3.5" />
              </span>
              <code
                className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-fd-foreground"
                title={code}
              >
                {highlightQueryText(code, highlightQuery)}
              </code>
              <EntryCopyButton value={code} />
            </div>
          ) : null}

          {url ? (
            <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-fd-border/60 bg-fd-muted/30 px-2 py-1">
              <span
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-fd-border/60 bg-fd-muted/40 text-fd-muted-foreground"
                title="平台主页"
                aria-hidden
              >
                <Globe className="size-3.5" />
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                title={url}
                className={cn(
                  'min-w-0 flex-1 truncate font-mono text-[11px] font-medium',
                  'text-sky-700 underline decoration-fd-border/60 underline-offset-2',
                  'hover:decoration-sky-700 dark:text-sky-300 dark:hover:decoration-sky-300',
                )}
              >
                {url}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
