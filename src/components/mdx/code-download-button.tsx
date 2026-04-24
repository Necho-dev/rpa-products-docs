'use client';

import { Check, Copy, FileDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { downloadTextAsFile, safeWriteClipboard } from '@/lib/code-block-utils';

const btnCls =
  'inline-flex items-center justify-center rounded-md p-1 text-sm transition-colors duration-100 [&_svg]:size-4 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

export function CodeDownloadButton({
  code,
  lang,
  className,
  children,
  showCopy = false,
}: {
  code: string;
  lang: string;
  className?: string;
  children?: ReactNode;
  /** 是否显示内置复制按钮（allowCopy=false 时使用） */
  showCopy?: boolean;
}) {
  const ext = lang === 'text' ? 'txt' : lang;

  const [copied, onCopy] = useCopyButton(() => void safeWriteClipboard(code));

  return (
    <div className={['flex items-center', className].filter(Boolean).join(' ')}>
      {children}
      {showCopy ? (
        <button
          type="button"
          aria-label={copied ? 'Copied' : 'Copy'}
          data-checked={copied || undefined}
          onClick={onCopy}
          className={btnCls}
        >
          {copied ? <Check /> : <Copy />}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => downloadTextAsFile(code, ext)}
        title="下载代码"
        aria-label="下载代码文件"
        className={btnCls}
      >
        <FileDown />
      </button>
    </div>
  );
}
