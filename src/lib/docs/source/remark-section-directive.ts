import { visit } from 'unist-util-visit';
import type { Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';

interface ContainerDirectiveNode {
  type: 'containerDirective';
  name: string;
  children: RootContent[];
}

/**
 * `:::section{#id}` is an include-extraction marker for fumadocs `remark-include`.
 * Include already unwraps to `node.children`; the source page must do the same.
 *
 * Without this plugin, remark-rehype turns the directive into a bare `<div>`
 * (id dropped). That wrapper breaks `.prose > :first-child` margin reset, so the
 * first heading keeps a full `margin-top` and looks like an empty gap.
 *
 * Include extracts from a fresh parse that does not run this plugin, so
 * `containerDirective` remains findable for `::include[file#id]`.
 */
const remarkSectionDirective: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'containerDirective', (node, idx, parent) => {
      const directive = node as ContainerDirectiveNode;
      if (directive.name !== 'section' || typeof idx !== 'number' || !parent) {
        return;
      }

      (parent.children as RootContent[]).splice(idx, 1, ...directive.children);
      return idx;
    });
  };
};

export { remarkSectionDirective };
