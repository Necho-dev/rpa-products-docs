import { FileText } from 'lucide-react';
import type { ResolvedReference } from '@/lib/docs/doc-references';
import { renderDocIcon } from '@/lib/docs/icons/client';
import { cn } from '@/lib/core/cn';

/** 默认文档图标：描边 + 浅填充都走主题色 */
export function ReferenceFileIcon({ className }: { className?: string }) {
  return (
    <FileText
      className={cn('size-3.5 shrink-0 text-fd-primary fill-fd-primary/25', className)}
      aria-hidden
    />
  );
}

/** 引用卡图标：优先目标页 icon；没有则用预置 FileText。 */
export function ReferenceDocIcon({
  reference,
  className,
}: {
  reference: Pick<ResolvedReference, 'icon' | 'iconColor'>;
  className: string;
}) {
  const icon = renderDocIcon(reference.icon, { className }, reference.iconColor);
  if (icon) return icon;
  return <ReferenceFileIcon className={className} />;
}
