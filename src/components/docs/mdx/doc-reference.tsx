import 'server-only';

import { ReferenceCard } from '@/components/docs/references/reference-card';
import { ReferencePreview } from '@/components/docs/references/reference-preview';
import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { getPlacedReference } from '@/lib/docs/doc-references';
import type {
  ReferenceMode,
  ReferencePreviewSize,
  ReferencePromptType,
} from '@/lib/docs/doc-references-core';
import { source } from '@/lib/docs/source/source';

/**
 * 正文 :::references 一块。path 必须命中本页 frontmatter，否则不渲染。
 */
export async function DocReference({
  pageSlug,
  path,
  mode,
  size,
  prompt,
  badge,
}: {
  pageSlug: string[];
  path: string;
  mode?: ReferenceMode;
  size?: ReferencePreviewSize;
  prompt?: { label: string; type?: ReferencePromptType };
  badge?: { label?: string; color?: string };
}) {
  const page = source.getPage(pageSlug.length ? pageSlug : undefined);
  if (!page) return null;

  const access = await getDocAccessContextFromRequest();
  const reference = getPlacedReference(page, access, { path, mode, size, prompt, badge });
  if (!reference) return null;

  if (reference.mode === 'preview') {
    return <ReferencePreview reference={reference} access={access} />;
  }

  return (
    <div className="not-prose my-3">
      <ReferenceCard reference={reference} />
    </div>
  );
}
