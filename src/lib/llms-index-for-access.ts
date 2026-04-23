import type { Root } from 'fumadocs-core/page-tree';
import { llms } from 'fumadocs-core/source';
import type { DocAccessContext } from '@/lib/doc-access';
import { filterPageTreeForAccess } from '@/lib/docs-page-tree-access';
import { source } from '@/lib/source';

function formatLlmsIndexSection(pageTree: Root, lang: string | undefined): string {
  const L = llms(source);
  const meta = source.getNodeMeta(pageTree, lang);
  const title =
    (meta?.data && typeof meta.data.title === 'string' && meta.data.title) ||
    (typeof pageTree.name === 'string' ? pageTree.name : '') ||
    '';
  const out: string[] = [];
  out.push(`# ${title}`, '');
  const descFromMeta =
    meta?.data && typeof meta.data.description === 'string' ? meta.data.description.trim() : '';
  const descFromTree =
    typeof pageTree.description === 'string' ? pageTree.description.trim() : '';
  const desc = descFromMeta || descFromTree;
  if (desc) out.push(`> ${desc}`, '');
  for (const child of pageTree.children) {
    out.push(L.indexNode(child, lang));
  }
  return out.join('\n');
}

/** 与侧栏一致：按访问上下文过滤后的 `llms.txt` 索引正文（含 i18n 多语言块） */
export function buildLlmsIndexMarkdown(access: DocAccessContext): string {
  const langs = source.getLanguages();
  if (langs.length > 0) {
    return langs
      .map(({ language }) => {
        const filtered = filterPageTreeForAccess(source.getPageTree(language), access);
        return formatLlmsIndexSection(filtered, language);
      })
      .join('\n\n');
  }
  const filtered = filterPageTreeForAccess(source.getPageTree(), access);
  return formatLlmsIndexSection(filtered, undefined);
}
