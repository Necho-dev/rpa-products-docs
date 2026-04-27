'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import { safeWriteClipboard } from '@/lib/code-block-utils';

const cache = new Map<string, Promise<string>>();

/**
 * fumadocs-ui MarkdownCopyButton 的安全替代实现。
 * 原版使用 navigator.clipboard.write()（ClipboardItem API），
 * 在非 HTTPS / 不支持的浏览器下会抛出
 * "Cannot read properties of undefined (reading 'write')"。
 * 本版本降级为 safeWriteClipboard（writeText + execCommand 兜底）。
 */
export function MarkdownCopyButton({
  markdownUrl,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { markdownUrl: string }) {
  const [isLoading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleClick = async () => {
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
    <button
      type="button"
      disabled={isLoading}
      onClick={handleClick}
      {...props}
      className={cn(
        buttonVariants({
          color: 'secondary',
          size: 'sm',
          className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
        }),
        className,
      )}
    >
      {checked ? <Check /> : <Copy />}
      {children ?? 'Copy Markdown'}
    </button>
  );
}
