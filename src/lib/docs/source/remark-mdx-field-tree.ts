import { visit } from 'unist-util-visit';
import type { Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import {
  parseFieldTreeText,
  serializeFieldTreeDirectiveContent,
} from '@/lib/docs/field-tree/parse';

interface ContainerDirectiveNode {
  type: 'containerDirective';
  name: string;
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
  if (!attrs) return undefined;
  if (typeof attrs === 'object' && !Array.isArray(attrs)) {
    const v = attrs[name];
    return v == null ? undefined : String(v);
  }
  return undefined;
}

function numAttrExpression(name: string, value: number) {
  return {
    type: 'mdxJsxAttribute',
    name,
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: String(value),
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExpressionStatement',
              expression: { type: 'Literal', value },
            },
          ],
          sourceType: 'module',
        },
      },
    },
  };
}

function extractInnerText(
  directive: ContainerDirectiveNode,
  file: VFile,
): string {
  // 优先从 mdast 子节点序列化（含 @define 段落 + GFM table）
  const fromAst = serializeFieldTreeDirectiveContent(directive.children);
  if (fromAst.trim()) return fromAst;

  // 回退：从源文件 position 切片
  const start = directive.position?.start.offset;
  const end = directive.position?.end.offset;
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    typeof file.value === 'string'
  ) {
    const full = file.value.slice(start, end);
    const firstNl = full.indexOf('\n');
    const lastNl = full.lastIndexOf('\n:::');
    return firstNl >= 0
      ? full.slice(firstNl + 1, lastNl >= 0 ? lastNl : full.length)
      : full;
  }

  return '';
}

/**
 * Remark plugin: converts `:::field-tree` container directives into
 * <FieldTreeTable data="..." defaultExpanded={n} /> at compile time.
 */
const remarkMdxFieldTree: Plugin<[], Root> = () => {
  return (tree, file: VFile) => {
    visit(tree, 'containerDirective', (node, idx, parent) => {
      const directive = node as ContainerDirectiveNode;
      if (directive.name !== 'field-tree' || typeof idx !== 'number' || !parent) {
        return;
      }

      const innerText = extractInnerText(directive, file);

      let data: ReturnType<typeof parseFieldTreeText>;
      try {
        data = parseFieldTreeText(innerText);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`${msg} (:::field-tree)`);
      }

      const defaultExpandedRaw = getDirectiveAttr(directive, 'defaultExpanded');
      const defaultExpanded = defaultExpandedRaw ? Number(defaultExpandedRaw) : 0;

      const attributes: unknown[] = [
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: JSON.stringify(data),
        },
      ];

      if (defaultExpanded > 0) {
        attributes.push(numAttrExpression('defaultExpanded', defaultExpanded));
      }

      let originalText = ':::field-tree\n:::\n';
      const start = directive.position?.start.offset;
      const end = directive.position?.end.offset;
      if (
        typeof start === 'number' &&
        typeof end === 'number' &&
        typeof file.value === 'string'
      ) {
        originalText = file.value.slice(start, end);
      }

      (parent.children as unknown[])[idx] = {
        type: 'mdxJsxFlowElement',
        name: 'FieldTreeTable',
        attributes,
        children: [],
        data: {
          _stringify: { text: originalText },
        },
      };
    });
  };
};

export { remarkMdxFieldTree };
