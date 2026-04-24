'use client';

import { useRef } from 'react';
import { Download } from 'lucide-react';
import type { ComponentProps } from 'react';

function getExportFilename() {
  // Use last path segment of current URL as prefix, fallback to "Table"
  const slug = window.location.pathname
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop();
  const prefix = slug ? slug : 'Table';
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `${prefix}_${ts}.csv`;
}

function exportTableToCSV(table: HTMLTableElement) {
  const rows = Array.from(table.querySelectorAll('tr'));
  const csv = rows
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => {
          const text = (cell as HTMLElement).innerText.replace(/"/g, '""');
          return `"${text}"`;
        })
        .join(','),
    )
    .join('\n');

  // BOM for UTF-8 so Excel opens CJK characters correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getExportFilename();
  a.click();
  URL.revokeObjectURL(url);
}

export function TableWithExport(props: ComponentProps<'table'>) {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => tableRef.current && exportTableToCSV(tableRef.current)}
        title="导出 CSV"
        aria-label="导出表格为 CSV"
        className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-bl-md rounded-tr-md border border-fd-border/60 bg-fd-background/90 px-2 py-1 text-xs text-fd-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-fd-foreground group-hover:opacity-100"
      >
        <Download className="size-3.5" />
        <span>导出</span>
      </button>
      <table ref={tableRef} {...props} />
    </div>
  );
}
