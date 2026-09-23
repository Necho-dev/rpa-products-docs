import { visit } from 'unist-util-visit';
import type { Heading, Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { parse as parseYaml } from 'yaml';
import {
  jsxExpressionAttribute,
  jsxStringAttribute,
} from '@/lib/docs/source/mdx-jsx-ast';
import {
  apiPageDirectiveSchema,
  buildApiPageTocHeadings,
  loadOpenApiDocument,
  resolveApiPageSelection,
  resolveOpenApiDocument,
} from '@/lib/docs/openapi/api-page-directive';
import { renderApiPageMarkdown } from '@/lib/docs/openapi/api-page-markdown';

interface ContainerDirectiveNode {
  type: 'containerDirective';
  name: string;
  children: RootContent[];
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
}

function extractDirectiveInnerText(
  directive: ContainerDirectiveNode,
  file: VFile,
): string {
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
    const sliced =
      firstNl >= 0
        ? full.slice(firstNl + 1, lastNl >= 0 ? lastNl : full.length)
        : full;
    if (sliced.trim()) return sliced;
  }

  return directive.children
    .map((child) => {
      if (child.type === 'paragraph' && 'children' in child) {
        return child.children
          .map((node) =>
            'value' in node && typeof node.value === 'string' ? node.value : '',
          )
          .join('');
      }
      if (child.type === 'text') return child.value;
      return '';
    })
    .join('\n')
    .trim();
}

function parseDirectiveYaml(innerText: string, filePath: string): unknown {
  const trimmed = innerText.trim();
  if (!trimmed) return {};

  try {
    const parsed = parseYaml(trimmed);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected YAML mapping');
    }
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${filePath}: failed to parse :::api-page YAML — ${msg}`);
  }
}

function buildTocOnlyHeading(
  title: string,
  id: string,
  depth: Heading['depth'],
): Heading {
  return {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: `${title} [toc]` }],
    data: { hProperties: { id } },
  };
}

const remarkMdxApiPage: Plugin<[], Root> = () => {
  return async (tree, file: VFile) => {
    const filePath = file.path || 'unknown';
    const jobs: Array<{
      idx: number;
      parent: { children: unknown[] };
      directive: ContainerDirectiveNode;
    }> = [];

    visit(tree, 'containerDirective', (node, idx, parent) => {
      const directive = node as ContainerDirectiveNode;
      if (directive.name !== 'api-page' || typeof idx !== 'number' || !parent) {
        return;
      }
      jobs.push({ idx, parent: parent as { children: unknown[] }, directive });
    });

    for (const job of jobs.sort((a, b) => b.idx - a.idx)) {
      const innerText = extractDirectiveInnerText(job.directive, file);
      const raw = parseDirectiveYaml(innerText, filePath);
      const parsed = apiPageDirectiveSchema.safeParse(raw);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        throw new Error(`${filePath}: invalid :::api-page — ${msg}`);
      }

      const resolved = resolveOpenApiDocument(parsed.data.document, filePath);
      const spec = await loadOpenApiDocument(resolved);
      const selection = resolveApiPageSelection(spec, parsed.data, filePath);
      const showTitle = parsed.data.showTitle !== false;
      const headingLevel = parsed.data.headingLevel ?? 2;
      const tocHeadings = showTitle
        ? buildApiPageTocHeadings(spec, selection, headingLevel)
        : [];

      const document =
        resolved.kind === 'url' ? resolved.href : resolved.document;
      const attributes: unknown[] = [
        jsxStringAttribute('document', document),
        jsxExpressionAttribute('operations', selection.operations),
        jsxExpressionAttribute('webhooks', selection.webhooks),
        jsxExpressionAttribute('showTitle', showTitle),
        jsxExpressionAttribute(
          'showDescription',
          parsed.data.showDescription !== false,
        ),
        jsxExpressionAttribute('playground', parsed.data.playground !== false),
        jsxExpressionAttribute('showExample', parsed.data.showExample !== false),
        jsxExpressionAttribute('headingLevel', headingLevel),
      ];

      if (parsed.data.server) {
        attributes.push(jsxStringAttribute('server', parsed.data.server));
      }
      if (parsed.data.proxy !== undefined) {
        attributes.push(jsxExpressionAttribute('proxy', parsed.data.proxy));
      }

      const markdown = renderApiPageMarkdown({
        document: spec,
        selection,
        server: parsed.data.server,
        showTitle,
        showDescription: parsed.data.showDescription !== false,
        showExample: parsed.data.showExample !== false,
        headingLevel,
      });
      const jsxNode = {
        type: 'mdxJsxFlowElement',
        name: 'APIPage',
        attributes,
        children: [],
        data: { _stringify: { text: markdown } },
      };

      job.parent.children.splice(
        job.idx,
        1,
        ...tocHeadings.map((heading) =>
          buildTocOnlyHeading(heading.title, heading.id, heading.depth),
        ),
        jsxNode,
      );
    }
  };
};

export { remarkMdxApiPage };
