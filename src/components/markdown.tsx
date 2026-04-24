import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
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

/** rehype-sanitize schema：在默认白名单基础上保留代码高亮所需的 class/style 属性 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'style'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className', 'style'],
  },
};

function createProcessor(): Processor {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeWrapWords);

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
        allowCopy: false,
        Actions: ({ className: actionsCls }) => (
          <CodeDownloadButton code={codeText} lang={lang} className={actionsCls} showCopy />
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

const CACHE_MAX = 100;
const cache = new Map<string, Promise<ReactNode>>();

function cacheGet(key: string): Promise<ReactNode> | undefined {
  const hit = cache.get(key);
  if (hit) {
    // LRU: 将命中项移到末尾
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, value: Promise<ReactNode>): void {
  if (cache.size >= CACHE_MAX) {
    // 删除最久未使用的项（Map 迭代顺序即插入顺序）
    cache.delete(cache.keys().next().value!);
  }
  cache.set(key, value);
}

function Renderer({ text }: { text: string }) {
  const result = cacheGet(text) ?? processor.process(text);
  cacheSet(text, result);

  return use(result);
}
