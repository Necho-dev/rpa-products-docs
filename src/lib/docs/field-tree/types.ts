export interface FieldTreeRow {
  /** 首列展示文本（含反引号，不含 @模板 与 > 前缀） */
  fieldDisplay: string;
  /** 字段 key，用于报错与 CSV */
  fieldKey: string;
  /** 各列单元格展示文本（首列已替换为 fieldDisplay） */
  cells: string[];
  depth: number;
  attachTemplate?: string;
}

export interface FieldTreeNode extends FieldTreeRow {
  id: string;
  children: FieldTreeNode[];
  expandable: boolean;
}

export interface FieldTreeData {
  columns: string[];
  nodes: FieldTreeNode[];
}

export interface TemplateRow {
  fieldDisplay: string;
  fieldKey: string;
  cells: string[];
  attachTemplate?: string;
}
