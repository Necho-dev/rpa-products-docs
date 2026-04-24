import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import {
  Children,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  Suspense,
  use,
  useDeferredValue,
} from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { shikiDocsThemes } from '@/lib/shiki-docs-themes';
import { cn } from '@/lib/cn';
import { getLanguageLabel } from '@/lib/code-block-language';
import { SKIP, visitParents } from 'unist-util-visit-parents';
import type { ElementContent, Root, RootContent } from 'hast';
import { Mermaid } from '@/components/mdx/mermaid';
import { TableWithExport } from '@/components/mdx/table-export';
import { CodeDownloadButton } from '@/components/mdx/code-download-button';

export interface Processor {
  process: (content: string) => Promise<ReactNode>;
}

/**
 * `rehypeWrapWords` inserts `<span>` around words for fade-in animation.
 * Table-related elements may only contain specific children (e.g. `tr` in `tbody`, not `span`).
 * Wrapping inter-element whitespace or misplaced text would produce invalid HTML and React hydration errors.
 *
 * Uses `ancestors` from `visitParents` because hast nodes from `remark-rehype` do not reliably carry `.parent`.
 */
function allowsWordWrapSpanFromAncestors(ancestors: readonly unknown[]): boolean {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const n = ancestors[i];
    if (!n || typeof n !== 'object' || (n as { type?: string }).type !== 'element') continue;
    const t = (n as { tagName?: string }).tagName;
    if (t === 'td' || t === 'th') return true;
    if (
      t === 'table' ||
      t === 'thead' ||
      t === 'tbody' ||
      t === 'tfoot' ||
      t === 'tr' ||
      t === 'colgroup' ||
      t === 'col'
    ) {
      return false;
    }
  }
  return true;
}

function isUnderPreInAncestors(ancestors: readonly unknown[]): boolean {
  return ancestors.some(
    (n) =>
      n &&
      typeof n === 'object' &&
      (n as { type?: string }).type === 'element' &&
      (n as { tagName?: string }).tagName === 'pre',
  );
}

export function rehypeWrapWords() {
  return (tree: Root) => {
    visitParents(tree, 'text', (node, ancestors) => {
      if (node.type !== 'text') return;
      if (isUnderPreInAncestors(ancestors)) return;
      if (!allowsWordWrapSpanFromAncestors(ancestors)) return;

      const words = node.value.split(/(?=\s)/);

      // Create new span nodes for each word and whitespace
      const newNodes: ElementContent[] = words.flatMap((word) => {
        if (word.length === 0) return [];

        return {
          type: 'element',
          tagName: 'span',
          properties: {
            class: 'animate-fd-fade-in',
          },
          children: [{ type: 'text', value: word }],
        };
      });

      Object.assign(node, {
        type: 'element',
        tagName: 'span',
        properties: {},
        children: newNodes,
      } satisfies RootContent);
      return SKIP;
    });
  };
}

function createProcessor(): Processor {
  const processor = remark().use(remarkGfm).use(remarkRehype).use(rehypeWrapWords);

  return {
    async process(content) {
      const nodes = processor.parse({ value: content });
      const hast = await processor.run(nodes);

      return toJsxRuntime(hast, {
        development: false,
        jsx,
        jsxs,
        Fragment,
        components: {
          ...defaultMdxComponents,
          pre: MarkdownCodePre,
          table: TableWithExport,
          img: undefined, // use JSX
        },
      });
    },
  };
}

function MarkdownCodePre(props: ComponentProps<'pre'>) {
  const code = Children.only(props.children) as ReactElement;
  const codeProps = code.props as ComponentProps<'code'>;
  const content = codeProps.children;
  if (typeof content !== 'string') return null;

  let lang =
    codeProps.className
      ?.split(' ')
      .find((v) => v.startsWith('language-'))
      ?.slice('language-'.length) ?? 'text';

  if (lang === 'mermaid') {
    return <Mermaid chart={content.trim()} />;
  }

  if (lang === 'mdx') lang = 'md';

  const langLabel = getLanguageLabel(lang);

  const codeText = content.trimEnd();

  return (
    <DynamicCodeBlock
      lang={lang}
      code={codeText}
      options={{ themes: { ...shikiDocsThemes } }}
      codeblock={{
        // keepBackground: true,
        className: cn(
          'rounded-lg border-fd-border/70 shadow-none ring-1 ring-fd-border/25 dark:ring-fd-border/40 focus:outline-none',
          props.className,
        ),
        title: (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 rounded-md border border-fd-border/80 bg-fd-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-fd-muted-foreground">
              {langLabel}
            </span>
          </span>
        ) as unknown as string,
        Actions: ({ className: actionsCls, children: actionChildren }) => (
          <CodeDownloadButton code={codeText} lang={lang} className={actionsCls}>
            {actionChildren}
          </CodeDownloadButton>
        ),
      }}
    />
  );
}

const processor = createProcessor();

export function Markdown({ text }: { text: string }) {
  const deferredText = useDeferredValue(text);

  return (
    <Suspense fallback={<p className="invisible">{text}</p>}>
      <Renderer text={deferredText} />
    </Suspense>
  );
}

const cache = new Map<string, Promise<ReactNode>>();

function Renderer({ text }: { text: string }) {
  const result = cache.get(text) ?? processor.process(text);
  cache.set(text, result);

  return use(result);
}
