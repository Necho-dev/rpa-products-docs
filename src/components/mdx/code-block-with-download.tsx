'use client';

import { useRef } from 'react';
import { Copy, Check, FileDown } from 'lucide-react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { cn } from '@/lib/cn';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import type { ReactNode } from 'react';
import { downloadTextAsFile, safeWriteClipboard } from '@/lib/code-block-utils';

const btnCls =
  'inline-flex items-center justify-center rounded-md p-1 text-sm transition-colors duration-100 [&_svg]:size-4 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

const codeBlockChromeClassName =
  'rounded-lg border-fd-border/70 shadow-none ring-1 ring-fd-border/25 dark:ring-fd-border/40';

function CodeActions({
  code,
  lang,
  className,
  containerRef,
}: {
  code: string;
  lang: string;
  className?: string;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const ext = lang === 'text' ? 'txt' : lang;

  const [copied, onCopy] = useCopyButton(() => {
    const pre = containerRef.current?.getElementsByTagName('pre').item(0);
    const text = pre
      ? (() => {
          const clone = pre.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('.nd-copy-ignore').forEach((n) => n.replaceWith('\n'));
          return clone.textContent ?? '';
        })()
      : code;
    void safeWriteClipboard(text);
  });

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        aria-label={copied ? 'Copied' : 'Copy'}
        data-checked={copied || undefined}
        onClick={onCopy}
        className={btnCls}
      >
        {copied ? <Check /> : <Copy />}
      </button>
      <button
        type="button"
        title="下载代码"
        aria-label="下载代码文件"
        onClick={() => downloadTextAsFile(code, ext)}
        className={btnCls}
      >
        <FileDown />
      </button>
    </div>
  );
}

export function CodeBlockWithDownload({
  code,
  lang,
  title,
  className,
  children,
  ...rest
}: {
  code: string;
  lang: string;
  title?: ReactNode;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const containerRef = useRef<HTMLElement>(null);

  return (
    <CodeBlock
      {...(rest as object)}
      ref={containerRef}
      title={title as string}
      allowCopy={false}
      className={cn(codeBlockChromeClassName, className)}
      Actions={({ className: actionsCls }) => (
        <CodeActions code={code} lang={lang} className={actionsCls} containerRef={containerRef} />
      )}
    >
      <Pre>{children}</Pre>
    </CodeBlock>
  );
}
