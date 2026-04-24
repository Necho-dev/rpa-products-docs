'use client';

import { FileDown } from 'lucide-react';
import type { ReactNode } from 'react';

function getExportFilename(ext: string) {
  const slug = window.location.pathname
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop();
  const prefix = slug ?? 'code';
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `${prefix}_${ts}.${ext}`;
}

function downloadText(content: string, ext: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getExportFilename(ext);
  a.click();
  URL.revokeObjectURL(url);
}

export function CodeDownloadButton({
  code,
  lang,
  className,
  children,
}: {
  code: string;
  lang: string;
  className?: string;
  children?: ReactNode;
}) {
  const ext = lang === 'text' ? 'txt' : lang;

  return (
    <div className={['flex items-center', className].filter(Boolean).join(' ')}>
      {children}
      <button
        type="button"
        onClick={() => downloadText(code, ext)}
        title="下载代码"
        aria-label="下载代码文件"
        className="inline-flex items-center justify-center rounded-md p-1 text-sm transition-colors duration-100 [&_svg]:size-4 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
      >
        <FileDown />
      </button>
    </div>
  );
}
