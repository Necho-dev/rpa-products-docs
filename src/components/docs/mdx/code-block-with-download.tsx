'use client';

import { useRef, useState } from 'react';
import { Copy, Check, FileDown, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { cn } from '@/lib/core/cn';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import type { ReactNode } from 'react';
import { downloadTextAsFile, safeWriteClipboard } from '@/lib/ui/code-block-utils';

export const btnCls =
  'inline-flex items-center justify-center rounded-md p-1 text-sm transition-colors duration-100 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

const iconCls = 'size-4';

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
        {copied ? <Check className={iconCls} /> : <Copy className={iconCls} />}
      </button>
      <button
        type="button"
        title="下载代码"
        aria-label="下载代码文件"
        onClick={() => downloadTextAsFile(code, ext)}
        className={btnCls}
      >
        <FileDown className={iconCls} />
      </button>
    </div>
  );
}

/** Shared collapse toggle button — icon order: Copy · Download · [this] */
export function CollapseButton({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={collapsed ? '展开代码块' : '折叠代码块'}
      title={collapsed ? '展开' : '折叠'}
      onClick={onToggle}
      className={cn(btnCls, className)}
    >
      {collapsed ? <PanelTopOpen className={iconCls} /> : <PanelTopClose className={iconCls} />}
    </button>
  );
}

export function CodeBlockWithDownload({
  code,
  lang,
  title,
  className,
  children,
  defaultCollapsed = false,
  ...rest
}: {
  code: string;
  lang: string;
  title?: ReactNode;
  className?: string;
  children?: ReactNode;
  /** 默认是否折叠，对应 meta 中的 `collapsed` 关键字 */
  defaultCollapsed?: boolean;
  [key: string]: unknown;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggle = () => setCollapsed((v) => !v);

  // icon 由 CodeBlockTitle 渲染，勿再传给 CodeBlock（否则会重复显示）
  const { icon: _icon, ...codeBlockRest } = rest as { icon?: ReactNode };

  return (
    <CodeBlock
      {...codeBlockRest}
      ref={containerRef}
      title={
        (title ? (
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="min-w-0 flex-1">{title}</span>
          </span>
        ) : undefined) as string | undefined
      }
      allowCopy={false}
      className={cn(codeBlockChromeClassName, className)}
      viewportProps={collapsed ? { style: { display: 'none' } } : undefined}
      Actions={({ className: actionsCls }) => (
        <div className={cn('flex items-center', actionsCls)}>
          <CodeActions code={code} lang={lang} containerRef={containerRef} />
          <CollapseButton collapsed={collapsed} onToggle={toggle} />
        </div>
      )}
    >
      <Pre>{children}</Pre>
    </CodeBlock>
  );
}
