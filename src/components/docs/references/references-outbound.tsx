import { ReferenceCard } from '@/components/docs/references/reference-card';
import { ReferencePreview } from '@/components/docs/references/reference-preview';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { getPageReferences } from '@/lib/docs/doc-references';
import type { source } from '@/lib/docs/source/source';
import { cn } from '@/lib/core/cn';

type DocPage = (typeof source)['$inferPage'];

/**
 * 出口引用区块（RSC 壳）：解析 + 鉴权在服务端做完。
 * preview 走内联正文；其余 mode 走 client 卡片。
 * 全部边被丢弃（缺页 / 无权限）时不渲染任何东西，与「未配置不展示」合流。
 */
export function ReferencesOutbound({
  page,
  access,
  className,
}: {
  page: DocPage;
  access: DocAccessContext;
  className?: string;
}) {
  const references = getPageReferences(page, access);
  if (references.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {references.map((reference) =>
        reference.mode === 'preview' ? (
          <ReferencePreview key={reference.url} reference={reference} access={access} />
        ) : (
          <div key={reference.url} className="not-prose">
            <ReferenceCard reference={reference} />
          </div>
        ),
      )}
    </div>
  );
}
