import { DocsBody } from 'fumadocs-ui/layouts/notebook/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { TOCItemType } from 'fumadocs-core/toc';
import { getMDXComponents } from '@/components/docs/mdx';
import { DocsLink } from '@/components/docs/docs-link';
import { PeekHeadingScope } from '@/components/docs/peek-heading-scope';
import { ReferenceCard } from '@/components/docs/references/reference-card';
import { ReferencePreviewFrame } from '@/components/docs/references/reference-preview-frame';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import type { ResolvedReference } from '@/lib/docs/doc-references';
import { isDocPageAccessible, resolveDocPage } from '@/lib/docs/docs-site-tools';
import { referencePreviewHeadingPrefix } from '@/lib/docs/peek-heading-id';
import { source } from '@/lib/docs/source/source';

/**
 * preview：把目标页正文 SSR 进限高滚动容器。
 * 不提供展开全文；完整阅读走悬浮工具条（分屏 / 新标签等）。
 * 不再嵌套出口引用块，避免 A 预览 B、B 预览 A 递归。
 */
export function ReferencePreview({
  reference,
  access,
}: {
  reference: ResolvedReference;
  access: DocAccessContext;
}) {
  const page = resolveDocPage(reference.url);
  if (!page || !isDocPageAccessible(page, access)) {
    return <ReferenceCard reference={{ ...reference, mode: 'summary' }} />;
  }

  const MDX = page.data.body;
  const toc = (page.data.toc ?? []) as TOCItemType[];
  const tocIds = toc.map((item) => item.url.replace(/^#/, '')).filter((id) => id.length > 0);
  const prefix = referencePreviewHeadingPrefix(page.url);

  return (
    <ReferencePreviewFrame
      href={reference.url}
      title={reference.title}
      kind={reference.kind}
      badge={reference.badge}
      prompt={reference.prompt}
      size={reference.size}
      updatedLabel={reference.updatedLabel}
      toc={toc}
      headingPrefix={prefix}
    >
      <PeekHeadingScope ids={tocIds} prefix={prefix} className="min-h-0 flex-none">
        <DocsBody className="mt-0 flex-1">
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page, DocsLink),
            })}
          />
        </DocsBody>
      </PeekHeadingScope>
    </ReferencePreviewFrame>
  );
}
