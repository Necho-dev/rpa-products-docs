import type { FieldTreeData, FieldTreeNode, TemplateRow } from './types';
import type { RootContent, Table, TableCell } from 'mdast';

function phrasingToText(node: RootContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'inlineCode') return `\`${node.value}\``;
  if ('children' in node && Array.isArray(node.children)) {
    return (node.children as RootContent[]).map(phrasingToText).join('');
  }
  return '';
}

function cellToText(cell: TableCell): string {
  return cell.children.map(phrasingToText).join('').trim();
}

function tableToMarkdown(table: Table): string {
  return table.children
    .map((row) => `| ${row.children.map(cellToText).join(' | ')} |`)
    .join('\n');
}

/**
 * 从 directive mdast 子节点重建可解析文本（比 position 切片更可靠）。
 */
export function serializeFieldTreeDirectiveContent(children: RootContent[]): string {
  const blocks: string[] = [];

  for (const child of children) {
    if (child.type === 'paragraph') {
      const text = child.children.map(phrasingToText).join('');
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length > 0) blocks.push(lines.join('\n'));
    } else if (child.type === 'table') {
      blocks.push(tableToMarkdown(child));
    }
  }

  // 块之间空行，触发 parseFieldTreeText 的 flush（区分 @define 模板表与主表）
  return blocks.join('\n\n');
}

const DEFINE_RE = /^@define\s+(\S+)\s*$/;
const COMMENT_RE = /^\/\//;
const SEPARATOR_RE = /^:?-{2,}:?$/;

let nodeIdCounter = 0;

function nextId(): string {
  nodeIdCounter += 1;
  return `ft-${nodeIdCounter}`;
}

function parsePipeRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return [];
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let i = 0;
  while (i < inner.length) {
    const ch = inner[i];
    if (ch === '\\' && inner[i + 1] === '|') {
      current += '|';
      i += 2;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => SEPARATOR_RE.test(c.trim()));
}

function parseFieldCell(
  raw: string,
  options: { isMainTable: boolean; forceDepth?: number },
): Pick<TemplateRow, 'fieldDisplay' | 'fieldKey' | 'attachTemplate'> & { depth: number } {
  let text = raw.trim();
  let depth = options.forceDepth ?? 0;

  if (options.isMainTable && options.forceDepth === undefined) {
    const gt = text.match(/^(>+\s*)/);
    if (gt) {
      depth = gt[1].replace(/\s/g, '').length;
      text = text.slice(gt[0].length).trim();
    }
  } else if (!options.isMainTable) {
    text = text.replace(/^>+\s*/, '').trim();
  }

  let attachTemplate: string | undefined;
  const attachMatch = text.match(/^(`[^`]+`)\s+@(\S+)$/);
  if (attachMatch) {
    attachTemplate = attachMatch[2];
    text = attachMatch[1];
  } else {
    const plainAttach = text.match(/^(.+?)\s+@(\S+)$/);
    if (plainAttach) {
      attachTemplate = plainAttach[2];
      text = plainAttach[1].trim();
    }
  }

  const fieldKey = text.replace(/^`|`$/g, '').trim();
  const fieldDisplay = text.startsWith('`') ? text : `\`${fieldKey}\``;

  return { fieldDisplay, fieldKey, attachTemplate, depth };
}

function isExpandableType(cells: string[], typeColIndex: number): boolean {
  if (typeColIndex < 0) return false;
  const type = cells[typeColIndex]?.replace(/`/g, '').trim() ?? '';
  return /^(Object|List|Array|Map|Dict)/i.test(type) || /^List\s*\[/i.test(type);
}

function findTypeColumnIndex(headers: string[]): number {
  const idx = headers.findIndex((h) => /数据类型|^类型$/i.test(h.trim()));
  return idx >= 0 ? idx : headers.findIndex((h) => h.includes('类型'));
}

function buildTreeFromFlatRows(
  rows: Array<{
    fieldDisplay: string;
    fieldKey: string;
    cells: string[];
    depth: number;
    attachTemplate?: string;
  }>,
): FieldTreeNode[] {
  const roots: FieldTreeNode[] = [];
  const stack: Array<{ node: FieldTreeNode; depth: number }> = [];

  for (const row of rows) {
    const node: FieldTreeNode = {
      id: nextId(),
      fieldDisplay: row.fieldDisplay,
      fieldKey: row.fieldKey,
      cells: row.cells,
      depth: row.depth,
      attachTemplate: row.attachTemplate,
      children: [],
      expandable: false,
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= row.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, depth: row.depth });
  }

  return roots;
}

function expandTemplates(
  nodes: FieldTreeNode[],
  templates: Map<string, TemplateRow[]>,
  typeColIndex: number,
  path: string[] = [],
): void {
  for (const node of nodes) {
    if (node.attachTemplate) {
      const name = node.attachTemplate;
      node.attachTemplate = undefined;
      if (path.includes(name)) {
        throw new Error(`field-tree: 模板循环引用 @${name}`);
      }
      const templateRows = templates.get(name);
      if (!templateRows) {
        throw new Error(`field-tree: 未知模板 @${name}`);
      }

      for (const tr of templateRows) {
        const parsed = parseFieldCell(tr.cells[0], {
          isMainTable: false,
          forceDepth: node.depth + 1,
        });
        const cells = [...tr.cells];
        cells[0] = parsed.fieldDisplay;

        const child: FieldTreeNode = {
          id: nextId(),
          fieldDisplay: parsed.fieldDisplay,
          fieldKey: parsed.fieldKey,
          cells,
          depth: node.depth + 1,
          attachTemplate: parsed.attachTemplate ?? tr.attachTemplate,
          children: [],
          expandable: false,
        };
        node.children.push(child);

        if (child.attachTemplate) {
          expandTemplates([child], templates, typeColIndex, [...path, name]);
        }
      }
    }

    if (node.children.length > 0) {
      expandTemplates(node.children, templates, typeColIndex, path);
    }
  }
}

function markExpandable(nodes: FieldTreeNode[], typeColIndex: number): void {
  for (const node of nodes) {
    node.expandable =
      node.children.length > 0 || isExpandableType(node.cells, typeColIndex);
    if (node.children.length > 0) {
      markExpandable(node.children, typeColIndex);
    }
  }
}

function rowsToTemplateRows(rows: string[][]): TemplateRow[] {
  const result: TemplateRow[] = [];
  for (const cells of rows) {
    if (cells.every((c) => !c.trim())) continue;
    if (isSeparatorRow(cells)) continue;
    const parsed = parseFieldCell(cells[0], { isMainTable: false });
    const rowCells = [...cells];
    rowCells[0] = parsed.fieldDisplay;
    result.push({
      fieldDisplay: parsed.fieldDisplay,
      fieldKey: parsed.fieldKey,
      cells: rowCells,
      attachTemplate: parsed.attachTemplate,
    });
  }
  return result;
}

function parseMainTableRows(allRows: string[][]): {
  columns: string[];
  nodes: FieldTreeNode[];
  typeColIndex: number;
} {
  if (allRows.length < 2) {
    throw new Error('field-tree: 主表至少需要表头与一行数据');
  }

  const headerRow = allRows[0];
  let dataStart = 1;
  if (allRows[1] && isSeparatorRow(allRows[1])) {
    dataStart = 2;
  }

  const columns = headerRow;
  const typeColIndex = findTypeColumnIndex(columns);

  const flatRows: Array<{
    fieldDisplay: string;
    fieldKey: string;
    cells: string[];
    depth: number;
    attachTemplate?: string;
  }> = [];

  for (let i = dataStart; i < allRows.length; i++) {
    const cells = allRows[i];
    if (!cells || cells.every((c) => !c.trim())) continue;

    const parsed = parseFieldCell(cells[0], { isMainTable: true });
    const rowCells = [...cells];
    rowCells[0] = parsed.fieldDisplay;

    flatRows.push({
      fieldDisplay: parsed.fieldDisplay,
      fieldKey: parsed.fieldKey,
      cells: rowCells,
      depth: parsed.depth,
      attachTemplate: parsed.attachTemplate,
    });
  }

  return { columns, nodes: buildTreeFromFlatRows(flatRows), typeColIndex };
}

/**
 * 解析 :::field-tree directive 内部原始文本。
 * 使用文本解析以避免 @define 与表格同行时 mdast 合并段落的问题。
 */
export function parseFieldTreeText(raw: string): FieldTreeData {
  nodeIdCounter = 0;

  const templates = new Map<string, TemplateRow[]>();
  const mainTables: string[][][] = [];
  let pendingDefine: string | null = null;
  let currentPipeRows: string[][] = [];

  function flushPipeBlock() {
    if (currentPipeRows.length === 0) return;
    if (pendingDefine) {
      if (templates.has(pendingDefine)) {
        throw new Error(`field-tree: 重复定义模板 @${pendingDefine}`);
      }
      templates.set(pendingDefine, rowsToTemplateRows(currentPipeRows));
      pendingDefine = null;
    } else {
      mainTables.push(currentPipeRows);
    }
    currentPipeRows = [];
  }

  for (const line of raw.split(/\r?\n/)) {
    const trim = line.trim();
    if (!trim || COMMENT_RE.test(trim)) {
      flushPipeBlock();
      continue;
    }

    const defineMatch = trim.match(DEFINE_RE);
    if (defineMatch) {
      flushPipeBlock();
      pendingDefine = defineMatch[1];
      continue;
    }

    if (trim.startsWith('|')) {
      currentPipeRows.push(parsePipeRow(trim));
      continue;
    }

    flushPipeBlock();
  }

  flushPipeBlock();

  if (pendingDefine) {
    throw new Error(`field-tree: @define ${pendingDefine} 后缺少表格`);
  }

  if (mainTables.length === 0) {
    throw new Error('field-tree: 缺少主表（含表头的表格）');
  }

  const mainRows = mainTables[mainTables.length - 1];
  const { columns, nodes, typeColIndex } = parseMainTableRows(mainRows);

  expandTemplates(nodes, templates, typeColIndex);
  markExpandable(nodes, typeColIndex);

  return { columns, nodes };
}

/** 扁平化全部节点（CSV 导出） */
export function flattenAllNodes(
  nodes: FieldTreeNode[],
  result: FieldTreeNode[] = [],
): FieldTreeNode[] {
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      flattenAllNodes(node.children, result);
    }
  }
  return result;
}

/** 可见行（尊重 expandedIds） */
export function flattenVisibleNodes(
  nodes: FieldTreeNode[],
  expandedIds: Set<string>,
  result: FieldTreeNode[] = [],
): FieldTreeNode[] {
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      flattenVisibleNodes(node.children, expandedIds, result);
    }
  }
  return result;
}

export function getInitialExpandedIds(
  nodes: FieldTreeNode[],
  defaultExpanded: number,
): Set<string> {
  const expanded = new Set<string>();

  function walk(list: FieldTreeNode[], depth: number) {
    for (const node of list) {
      if (node.children.length > 0 && depth < defaultExpanded) {
        expanded.add(node.id);
        walk(node.children, depth + 1);
      }
    }
  }

  walk(nodes, 0);
  return expanded;
}
