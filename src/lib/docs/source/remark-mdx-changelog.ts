import { visit } from 'unist-util-visit';
import type { Heading, Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import {
  jsxExpressionAttribute,
  jsxStringAttribute,
} from '@/lib/docs/source/mdx-jsx-ast';

interface ContainerDirectiveNode {
  type: 'containerDirective';
  name: string;
  /** remark-directive: `:::changelog[pageSize=5]` → label */
  label?: string | null;
  /** remark-directive: `:::changelog{pageSize=5}` → attributes */
  attributes?: Record<string, string | null | undefined> | null;
  children: RootContent[];
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
}

function getDirectiveAttr(
  node: ContainerDirectiveNode,
  name: string,
): string | undefined {
  const attrs = node.attributes;
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return undefined;
  const v = attrs[name];
  return v == null ? undefined : String(v);
}

/**
 * 解析每页条数：`:::changelog{pageSize=5}` 或 `:::changelog[pageSize=5]`。
 */
function parsePageSize(directive: ContainerDirectiveNode): number | undefined {
  const fromAttr = getDirectiveAttr(directive, 'pageSize');

  const fromLabel = (() => {
    const label = directive.label?.trim();
    if (!label) return undefined;
    const m = label.match(/^pageSize\s*=\s*(\d+)$/i);
    return m?.[1];
  })();

  const raw = fromAttr ?? fromLabel;
  if (raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`pageSize 无效：${raw}，应为正整数（如 pageSize=5）`);
  }
  return Math.floor(n);
}

const DATE_TOKEN_RE = /@(\d{8})\b/;
const VERSION_TOKEN_RE = /@v([\w.]+)\b/;
/** `@title ### 更新记录` 或 `@title 更新记录` */
const TITLE_LINE_RE = /^@title\s+(?:(#{1,6})\s+)?(.+?)\s*$/;

function isEntryLine(node: RootContent): boolean {
  if (node.type !== 'paragraph') return false;
  const first = node.children[0];
  if (!first || first.type !== 'text') return false;
  const text = first.value.split('\n')[0].trim();
  return text.startsWith('@') && DATE_TOKEN_RE.test(text);
}

function isTitleLine(node: RootContent): boolean {
  if (node.type !== 'paragraph') return false;
  const first = node.children[0];
  if (!first || first.type !== 'text') return false;
  return TITLE_LINE_RE.test(first.value.split('\n')[0].trim());
}

function parseTitleLine(node: RootContent): { title: string; depth: number } {
  if (node.type !== 'paragraph') throw new Error('not a paragraph');
  const first = node.children[0];
  if (!first || first.type !== 'text') throw new Error('not a text node');

  const m = first.value.split('\n')[0].trim().match(TITLE_LINE_RE);
  if (!m) throw new Error('标题行格式无效');
  const depth = m[1] ? m[1].length : 3;
  const title = m[2].trim();
  if (!title) throw new Error('@title 后缺少标题文本');
  return { title, depth };
}

function parseDate(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) throw new Error(`日期格式无效：@${raw}，应为 @YYYYMMDD`);
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseEntryMeta(node: RootContent): { date: string; version?: string; title?: string } {
  if (node.type !== 'paragraph') throw new Error('not a paragraph');
  const first = node.children[0];
  if (!first || first.type !== 'text') throw new Error('not a text node');

  let rest = first.value.split('\n')[0].trim();

  const dateMatch = rest.match(DATE_TOKEN_RE);
  if (!dateMatch) throw new Error('缺少日期 token');
  const date = parseDate(dateMatch[1]);
  rest = rest.replace(dateMatch[0], '');

  const versionMatch = rest.match(VERSION_TOKEN_RE);
  const version = versionMatch ? `v${versionMatch[1]}` : undefined;
  if (versionMatch) rest = rest.replace(versionMatch[0], '');

  const title = rest.trim() || undefined;
  return { date, ...(version ? { version } : {}), ...(title ? { title } : {}) };
}

function getOriginalDirectiveText(directive: ContainerDirectiveNode, file: VFile): string {
  const start = directive.position?.start.offset;
  const end = directive.position?.end.offset;
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    typeof file.value === 'string'
  ) {
    return file.value.slice(start, end);
  }
  return `:::changelog\n:::\n`;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function buildEntryAnchorId(date: string, title?: string, index?: number): string {
  const base = title ? slugify(title) : 'entry';
  const suffix = base || `entry-${(index ?? 0) + 1}`;
  return `changelog-${date}-${suffix}`;
}

function buildSectionAnchorId(title: string): string {
  return slugify(title) || '更新记录';
}

/**
 * TOC-only heading：进入右侧导航，渲染时由 rehype-toc 移除（标题带 [toc]）。
 */
function buildSectionTocHeading(title: string, id: string, depth: number): RootContent {
  return {
    type: 'heading',
    depth: Math.min(6, Math.max(1, depth)) as Heading['depth'],
    children: [{ type: 'text', value: `${title} [toc]` }],
    data: { hProperties: { id } },
  };
}

/**
 * Entry TOC：日期与标题分层展示。
 */
function buildEntryTocHeading(
  date: string,
  title: string | undefined,
  id: string,
  depth: number,
): RootContent {
  const dateNode = {
    type: 'mdxJsxTextElement',
    name: 'span',
    attributes: [jsxStringAttribute('className', 'toc-changelog-date')],
    children: [{ type: 'text', value: date }],
  };

  const children: unknown[] = [
    {
      type: 'mdxJsxTextElement',
      name: 'span',
      attributes: [jsxStringAttribute('className', 'toc-changelog-entry')],
      children: title
        ? [
            dateNode,
            {
              type: 'mdxJsxTextElement',
              name: 'span',
              attributes: [jsxStringAttribute('className', 'toc-changelog-title')],
              children: [{ type: 'text', value: title }],
            },
          ]
        : [dateNode],
    },
    { type: 'text', value: ' [toc]' },
  ];

  return {
    type: 'heading',
    depth: Math.min(6, Math.max(1, depth)) as Heading['depth'],
    children: children as Heading['children'],
    data: { hProperties: { id } },
  };
}

/**
 * 更新日志正文内的标题仍正常渲染，不进入右侧 TOC。
 * 通过 fumadocs rehype-toc 的 `[!toc]` 标记排除，同时保留 hProperties.id，
 * 避免后续 remark-structure 因缺 id 告警。
 */
function excludeBodyHeadingsFromToc(nodes: RootContent[]): void {
  for (const node of nodes) {
    if (node.type === 'heading') {
      const heading = node as Heading;
      const children = heading.children;
      if (!children?.length) continue;

      const last = children[children.length - 1];
      if (last?.type === 'text') {
        if (!/\[!?toc\]/.test(last.value)) {
          last.value = `${last.value.replace(/\s+$/, '')} [!toc]`;
        }
      } else {
        children.push({ type: 'text', value: ' [!toc]' });
      }
      continue;
    }

    if ('children' in node && Array.isArray(node.children)) {
      excludeBodyHeadingsFromToc(node.children as RootContent[]);
    }
  }
}

/**
 * Remark plugin: converts `:::changelog` container directives into
 * TOC-only headings + <ChangelogTimeline title=...> wrapping entries.
 * Entries are emitted newest-first so TOC matches default「最新优先」.
 */
const remarkMdxChangelog: Plugin<[], Root> = () => {
  return (tree, file: VFile) => {
    const filePath = file.path ?? file.history?.[0] ?? '<unknown>';

    visit(tree, 'containerDirective', (node, idx, parent) => {
      const directive = node as ContainerDirectiveNode;
      if (directive.name !== 'changelog' || typeof idx !== 'number' || !parent) {
        return;
      }

      const originalText = getOriginalDirectiveText(directive, file);

      let pageSize: number | undefined;
      try {
        pageSize = parsePageSize(directive);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`${filePath}: :::changelog 解析错误 — ${msg}`);
      }

      type EntryGroup = {
        meta: { date: string; version?: string; title?: string };
        children: RootContent[];
      };

      let sectionTitle = '更新记录';
      let sectionDepth = 3;
      const groups: EntryGroup[] = [];
      let current: EntryGroup | null = null;

      for (const child of directive.children) {
        if (isTitleLine(child)) {
          try {
            const parsed = parseTitleLine(child);
            sectionTitle = parsed.title;
            sectionDepth = parsed.depth;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`${filePath}: :::changelog 解析错误 — ${msg}`);
          }
          continue;
        }

        if (isEntryLine(child)) {
          try {
            const meta = parseEntryMeta(child);
            current = { meta, children: [] };
            groups.push(current);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`${filePath}: :::changelog 解析错误 — ${msg}`);
          }
        } else if (current) {
          current.children.push(child);
        }
      }

      if (groups.length === 0) {
        throw new Error(
          `${filePath}: :::changelog 内未找到任何合法条目行（应以 @YYYYMMDD 开头，如 @20260417 标题）`,
        );
      }

      // 默认最新优先：按日期降序，与组件默认排序、TOC 初始顺序一致
      groups.sort((a, b) => b.meta.date.localeCompare(a.meta.date));

      const sectionId = buildSectionAnchorId(sectionTitle);
      const usedIds = new Set<string>([sectionId]);
      const tocHeadings: RootContent[] = [
        buildSectionTocHeading(sectionTitle, sectionId, sectionDepth),
      ];

      const entryDepth = Math.min(6, sectionDepth + 1);
      const entryIds: string[] = [];
      const entryNodes = groups.map(({ meta, children }, i) => {
        let id = buildEntryAnchorId(meta.date, meta.title, i);
        if (usedIds.has(id)) id = `${id}-${i + 1}`;
        usedIds.add(id);
        entryIds.push(id);

        tocHeadings.push(buildEntryTocHeading(meta.date, meta.title, id, entryDepth));

        excludeBodyHeadingsFromToc(children);

        const attrs: unknown[] = [
          jsxStringAttribute('date', meta.date),
          jsxStringAttribute('id', id),
        ];
        if (meta.version) attrs.push(jsxStringAttribute('version', meta.version));
        if (meta.title) attrs.push(jsxStringAttribute('title', meta.title));

        return {
          type: 'mdxJsxFlowElement',
          name: 'ChangelogEntry',
          attributes: attrs,
          children,
        };
      });

      const timelineAttrs: unknown[] = [
        jsxExpressionAttribute('count', groups.length),
        jsxStringAttribute('title', sectionTitle),
        jsxExpressionAttribute('titleDepth', sectionDepth),
        jsxStringAttribute('titleId', sectionId),
        // newest-first ids，供客户端 TOC 跟随排序 / 分页
        jsxStringAttribute('entryIds', JSON.stringify(entryIds)),
      ];
      if (pageSize != null) {
        timelineAttrs.push(jsxExpressionAttribute('pageSize', pageSize));
      }

      const timelineNode = {
        type: 'mdxJsxFlowElement',
        name: 'ChangelogTimeline',
        attributes: timelineAttrs,
        children: entryNodes,
        data: {
          _stringify: { text: originalText },
        },
      };

      (parent.children as unknown[]).splice(idx, 1, ...tocHeadings, timelineNode);
    });
  };
};

export { remarkMdxChangelog };
