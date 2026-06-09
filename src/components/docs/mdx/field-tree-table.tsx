'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Download, SquareMinus, SquarePlus } from 'lucide-react';
import {
  flattenAllNodes,
  flattenVisibleNodes,
  getInitialExpandedIds,
} from '@/lib/docs/field-tree/parse';
import type { FieldTreeData, FieldTreeNode } from '@/lib/docs/field-tree/types';

function getExportFilename() {
  const slug = window.location.pathname
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop();
  const prefix = slug ?? 'field-tree';
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `${prefix}_${ts}.csv`;
}

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** 导出时去掉 Markdown 反引号，保留其余文本 */
function formatExportCell(text: string): string {
  return text.replace(/`([^`]+)`/g, '$1').trim();
}

function exportFieldTreeCSV(columns: string[], nodes: FieldTreeNode[]) {
  const flat = flattenAllNodes(nodes);
  const header = ['层级', ...columns].map(escapeCsvField).join(',');
  const rows = flat.map((node) => {
    const exportCells = node.cells.map((cell, index) =>
      index === 0 ? node.fieldKey : formatExportCell(cell),
    );
    const row = [String(node.depth), ...exportCells];
    return row.map(escapeCsvField).join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getExportFilename();
  a.click();
  URL.revokeObjectURL(url);
}

/** 将单元格中的 `code` 反引号片段渲染为 <code>，与普通 Markdown 表格一致 */
function renderCellContent(text: string): ReactNode {
  if (!text.includes('`')) return text;

  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (!part) return null;
    return <span key={i}>{part}</span>;
  });
}

function FieldTreeRow({
  node,
  columnCount,
  expanded,
  onToggle,
}: {
  node: FieldTreeNode;
  columnCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const showToggle = node.expandable && hasChildren;

  return (
    <tr data-depth={node.depth}>
      <td>
        <div
          className="field-tree-cell-inner"
          style={{ paddingInlineStart: `${node.depth * 1.125}rem` }}
        >
          {showToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={expanded ? '收起' : '展开'}
              className="field-tree-toggle"
            >
              {expanded ? (
                <SquareMinus className="size-3.5" aria-hidden />
              ) : (
                <SquarePlus className="size-3.5" aria-hidden />
              )}
            </button>
          ) : (
            <span className="field-tree-toggle-spacer" aria-hidden />
          )}
          <span className="field-tree-field-text">{renderCellContent(node.cells[0])}</span>
        </div>
      </td>
      {Array.from({ length: Math.max(0, columnCount - 1) }, (_, i) => (
        <td key={i}>{renderCellContent(node.cells[i + 1] ?? '')}</td>
      ))}
    </tr>
  );
}

export function FieldTreeTable({
  data: dataJson,
  defaultExpanded = 0,
}: {
  data: string;
  defaultExpanded?: number;
}) {
  const parsed = useMemo((): FieldTreeData | null => {
    try {
      return JSON.parse(dataJson) as FieldTreeData;
    } catch {
      return null;
    }
  }, [dataJson]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    parsed ? getInitialExpandedIds(parsed.nodes, defaultExpanded) : new Set(),
  );

  const tableRef = useRef<HTMLTableElement>(null);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!parsed) {
    return (
      <p className="my-4 text-sm text-red-600 dark:text-red-400">
        field-tree 数据解析失败
      </p>
    );
  }

  const { columns, nodes } = parsed;
  const visible = flattenVisibleNodes(nodes, expandedIds);

  return (
    <div className="group relative my-4" data-field-tree>
      <button
        type="button"
        onClick={() => exportFieldTreeCSV(columns, nodes)}
        title="导出 CSV"
        aria-label="导出表格为 CSV"
        className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-bl-md rounded-tr-md border border-fd-border/60 bg-fd-background/90 px-2 py-1 text-xs text-fd-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:text-fd-foreground group-hover:opacity-100"
      >
        <Download className="size-3.5" />
        <span>导出</span>
      </button>
      <div
        className="docs-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="可展开字段树表格"
      >
        <table ref={tableRef} className="docs-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((node) => (
              <FieldTreeRow
                key={node.id}
                node={node}
                columnCount={columns.length}
                expanded={expandedIds.has(node.id)}
                onToggle={() => toggle(node.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
