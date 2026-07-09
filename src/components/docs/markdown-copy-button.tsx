'use client';

import { Check, Copy, ScanText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/core/cn';
import { buttonVariants } from '@/components/ui/button';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';

const cache = new Map<string, Promise<string>>();

const splitButtonClass = buttonVariants({
  color: 'secondary',
  size: 'sm',
  className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
});

/**
 * Markdown 工具 Split 按钮：左侧一键复制，右侧 ScanText 图标在新标签页 View as Markdown。
 * 复制逻辑使用 safeWriteClipboard，兼容非 HTTPS 环境。
 */
export function MarkdownActionsButton({
  markdownUrl,
  className,
  copyLabel = 'Copy Markdown',
}: {
  markdownUrl: string;
  className?: string;
  copyLabel?: string;
}) {
  const [isLoading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleCopy = async () => {
    if (isLoading) return;
    try {
      setLoading(true);
      let promise = cache.get(markdownUrl);
      if (!promise) {
        promise = fetch(markdownUrl).then((res) => res.text());
        cache.set(markdownUrl, promise);
      }
      const text = await promise;
      await safeWriteClipboard(text);
      setChecked(true);
      setTimeout(() => setChecked(false), 1500);
    } catch {
      cache.delete(markdownUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('inline-flex items-stretch rounded-md', className)}>
      <button
        type="button"
        disabled={isLoading}
        onClick={handleCopy}
        className={cn(splitButtonClass, 'rounded-r-none border-r-0')}
      >
        {checked ? <Check /> : <Copy />}
        {copyLabel}
      </button>
      <a
        href={markdownUrl}
        target="_blank"
        rel="noreferrer noopener"
        title="View as Markdown"
        aria-label="View as Markdown"
        className={cn(
          splitButtonClass,
          'rounded-l-none border-l border-fd-border/60 px-2',
        )}
      >
        <ScanText className="size-3.5 text-fd-muted-foreground" />
      </a>
    </div>
  );
}

/** @deprecated 使用 MarkdownActionsButton */
export const MarkdownCopyButton = MarkdownActionsButton;
