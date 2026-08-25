'use client';

import type { ReactNode } from 'react';
import { DocsHoverToolbar } from '@/components/docs/docs-hover-toolbar';
import { cn } from '@/lib/core/cn';

/** 给引用卡挂 module-grid 同款悬浮工具条；toolbar 通过 hidden sentinel 认 parent 为 hover 根。 */
export function ReferenceShell({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('relative', className)}>
      <DocsHoverToolbar href={href} ariaLabel="引用文档快捷操作" />
      {children}
    </div>
  );
}
