import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import type { Root, RootContent } from 'mdast';
import { remarkSectionDirective } from '@/lib/docs/source/remark-section-directive';

async function processMarkdown(md: string): Promise<Root> {
  return unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkSectionDirective)
    .run(unified().use(remarkParse).use(remarkDirective).parse(md)) as Promise<Root>;
}

describe('remarkSectionDirective', () => {
  it('unwraps :::section so children become root-level nodes', async () => {
    const tree = await processMarkdown(`:::section{#新建子账号}
## 一、创建子账号

hello
:::

## 二、添加账号
`);

    const types = tree.children.map((n: RootContent) => n.type);
    assert.deepEqual(types, ['heading', 'paragraph', 'heading']);
    assert.equal(
      tree.children.some((n) => n.type === 'containerDirective'),
      false,
    );
  });

  it('preserves content outside the section', async () => {
    const tree = await processMarkdown(`before

:::section{#x}
inside
:::

after
`);

    const paragraphs = tree.children.filter((n) => n.type === 'paragraph');
    assert.equal(paragraphs.length, 3);
  });
});
