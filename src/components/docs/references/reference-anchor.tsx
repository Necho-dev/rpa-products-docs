'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useOpenDocsHref } from '@/components/docs/docs-link';
import { cn } from '@/lib/core/cn';

/**
 * 出口卡片的统一根节点。
 *
 * 必须是真 `<a href>`：embed 页不套 DocPeekProvider，`useOpenDocsHref` 在拿不到 context 时
 * 直接 return 且不 preventDefault，靠原生 anchor 兜底跳转。做成 `<div onClick>` 在那里就是死块。
 *
 * 不用 DocsLink：它把内容包进 `<span className="relative inline">` 并挂 hover 预览卡，
 * 是给行内 prose 链接用的，块级卡片会破版。
 */
export function ReferenceAnchor({
  href,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const openDocs = useOpenDocsHref();

  return (
    <a
      href={href}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => openDocs(href, e)}
      className={cn(
        'group/reference block no-underline transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-1',
        className,
      )}
    >
      {children}
    </a>
  );
}
