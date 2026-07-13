import type { Folder, Node, Root } from 'fumadocs-core/page-tree';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { filterPageTreeForAccess } from '@/lib/docs/access/docs-page-tree-access';
import { source } from '@/lib/docs/source/source';
import { docsContentRoute, docsRoute } from '@/lib/core/shared';

const TAB = '  ';

/**
 * 将 HTML 文档路径（/docs/RPA_QIANNIU/foo）转换为绝对 Markdown URL。
 * 路径格式：{docsContentRoute}/{slug}.md
 * index 根页（URL 为 /docs）对应 {docsContentRoute}/index.md
 */
function pageUrlToMarkdownUrl(origin: string, htmlUrl: string): string {
  // htmlUrl 形如 /docs/RPA_QIANNIU/foo 或 /docs（index 根页）
  const prefix = docsRoute.replace(/\/$/, '');
  const slug = htmlUrl.startsWith(prefix) ? htmlUrl.slice(prefix.length) : htmlUrl;
  // 去掉开头 /，空字符串代表 index 根页
  const cleanSlug = slug.replace(/^\//, '');
  const mdPath = cleanSlug === '' ? 'index.md' : `${cleanSlug}.md`;
  return `${origin}${docsContentRoute}/${mdPath}`;
}

function escapeLinkTitle(title: string): string {
  return title.replace(/([[\]])/g, '\\$1');
}

function escapeLinkUrl(url: string): string {
  return url.replace(/([()])/g, '\\$1');
}

function getNodeName(node: Node, lang: string | undefined): string {
  if (node.type === 'page' || node.type === 'folder') {
    if (node.type === 'page') {
      const page = source.getNodePage(node, lang);
      if (page?.data.title) return page.data.title;
    } else {
      const meta = source.getNodeMeta(node as Folder, lang);
      if (meta?.data && typeof (meta.data as { title?: string }).title === 'string') {
        return (meta.data as { title: string }).title;
      }
    }
    return typeof node.name === 'string' ? node.name : '';
  }
  return typeof node.name === 'string' ? node.name : '';
}

function getNodeDescription(node: Node, lang: string | undefined): string {
  if (node.type === 'page') {
    const page = source.getNodePage(node, lang);
    if (page?.data.description) return page.data.description;
    return typeof node.description === 'string' ? node.description : '';
  }
  if (node.type === 'folder') {
    const meta = source.getNodeMeta(node as Folder, lang);
    if (meta?.data && typeof (meta.data as { description?: string }).description === 'string') {
      return (meta.data as { description: string }).description;
    }
    return typeof node.description === 'string' ? node.description : '';
  }
  return '';
}

function formatListItem(name: string, description: string, indent: number): string {
  const prefix = TAB.repeat(indent);
  const desc = description.trim();
  return desc.length > 0 ? `${prefix}- ${name}: ${desc}` : `${prefix}- ${name}`;
}

function formatNode(
  node: Node,
  indent: number,
  lang: string | undefined,
  origin: string,
): string {
  switch (node.type) {
    case 'page': {
      const name = getNodeName(node, lang);
      const mdUrl = pageUrlToMarkdownUrl(origin, node.url);
      const link = `[${escapeLinkTitle(name)}](${escapeLinkUrl(mdUrl)})`;
      return formatListItem(link, getNodeDescription(node, lang), indent);
    }
    case 'folder': {
      const out: string[] = [];
      out.push(formatListItem(getNodeName(node, lang), getNodeDescription(node, lang), indent));
      if (node.index) out.push(formatNode(node.index, indent + 1, lang, origin));
      for (const child of node.children) out.push(formatNode(child, indent + 1, lang, origin));
      return out.join('\n');
    }
    case 'separator': {
      const name = getNodeName(node, lang) || 'Separator';
      return '\n' + formatListItem(`**${name}**`, '', indent);
    }
  }
}

function formatLlmsIndexSection(
  pageTree: Root,
  lang: string | undefined,
  origin: string,
): string {
  const meta = source.getNodeMeta(pageTree, lang);
  const title =
    (meta?.data && typeof (meta.data as { title?: string }).title === 'string'
      ? (meta.data as { title: string }).title
      : '') ||
    (typeof pageTree.name === 'string' ? pageTree.name : '') ||
    '';
  const descFromMeta =
    meta?.data && typeof (meta.data as { description?: string }).description === 'string'
      ? (meta.data as { description: string }).description.trim()
      : '';
  const descFromTree =
    typeof pageTree.description === 'string' ? pageTree.description.trim() : '';
  const desc = descFromMeta || descFromTree;

  const out: string[] = [];
  out.push(`# ${title}`, '');
  if (desc) out.push(`> ${desc}`, '');
  for (const child of pageTree.children) {
    out.push(formatNode(child, 0, lang, origin));
  }
  return out.join('\n');
}

/**
 * 与侧栏一致：按访问上下文过滤后的 `llms.txt` 索引正文（含 i18n 多语言块）。
 * 页面链接为指向 `.md` 内容的完整绝对 URL，AI 工具可直接获取 Markdown 原文。
 */
export function buildLlmsIndexMarkdown(access: DocAccessContext, origin: string): string {
  const langs = source.getLanguages();
  if (langs.length > 0) {
    return langs
      .map(({ language }) => {
        const filtered = filterPageTreeForAccess(source.getPageTree(language), access);
        return formatLlmsIndexSection(filtered, language, origin);
      })
      .join('\n\n');
  }
  const filtered = filterPageTreeForAccess(source.getPageTree(), access);
  return formatLlmsIndexSection(filtered, undefined, origin);
}
