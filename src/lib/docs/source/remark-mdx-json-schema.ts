import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

/**
 * Remark plugin: converts ```json-schema [meta]``` code blocks into
 * <JsonSchema schema="..." collapsed /> MDX JSX elements at compile time.
 *
 * Supported meta flags:
 *   collapsed  — render the component in collapsed state by default
 */
const remarkMdxJsonSchema: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node, idx, parent) => {
      if (node.lang !== 'json-schema' || !node.value || typeof idx !== 'number' || !parent) return;

      const meta = node.meta ?? '';
      const collapsed = /\bcollapsed\b/.test(meta);

      const attributes: unknown[] = [
        {
          type: 'mdxJsxAttribute',
          name: 'schema',
          value: node.value.trim(),
        },
      ];

      if (collapsed) {
        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'defaultCollapsed',
          // boolean attribute with a JSX expression value of `true`
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: 'true',
            data: {
              estree: {
                type: 'Program',
                body: [{ type: 'ExpressionStatement', expression: { type: 'Literal', value: true } }],
                sourceType: 'module',
              },
            },
          },
        });
      }

      const metaSuffix = collapsed ? ' collapsed' : '';
      const originalCodeBlock = `\`\`\`json-schema${metaSuffix}\n${node.value.trim()}\n\`\`\``;

      (parent.children as unknown[])[idx] = {
        type: 'mdxJsxFlowElement',
        name: 'JsonSchema',
        attributes,
        children: [],
        // View as Markdown / llms 导出走 processed 时，还原为原始 json-schema 代码块
        data: {
          _stringify: { text: originalCodeBlock },
        },
      };
    });
  };
};

export { remarkMdxJsonSchema };
