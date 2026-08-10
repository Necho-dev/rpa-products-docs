import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { docsContentRoute, docsImageRoute, docsRoute, getPublicSiteUrlIfSet } from '@/lib/core/shared';
import { docIconsPlugin } from '@/lib/docs/source/doc-icons-plugin';
import { docsEntryInSidebarPlugin } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';
import { rewriteMarkdownImagesForEmbed } from '@/lib/docs/embed/markdown';
import { stripTocOnlyHeadings } from '@/lib/docs/source/module-grid-fs-scan';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [docIconsPlugin(), docsEntryInSidebarPlugin()],
});

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageSharePoster(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'poster.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageCover(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'cover.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const slugs = page.slugs;
  const segments = slugs.length > 0
    ? [...slugs.slice(0, -1), `${slugs[slugs.length - 1]}.md`]
    : ['index.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export type GetLLMTextOptions = {
  /** 站点根 URL；`llms.mdx` 等人类导出把图写成绝对 `/resources/images/...` */
  siteOrigin?: string | null;
  /**
   * MCP 正文：输出 `content/docs` 相对路径作图片标识，读图用 `get_docs_image`。
   */
  docsRelativeImagePaths?: boolean;
};

/**
 * LLM / MCP / llms.mdx 导出文本。
 * fumadocs remark-image 会把本地图编成 `src="__imgN"`，此处按 raw 路径还原。
 */
export async function getLLMText(
  page: (typeof source)['$inferPage'],
  options?: GetLLMTextOptions,
) {
  const [processed, raw] = await Promise.all([
    page.data.getText('processed'),
    page.data.getText('raw'),
  ]);
  const siteOrigin =
    options?.siteOrigin?.replace(/\/$/, '') || getPublicSiteUrlIfSet() || null;
  const rewritten = rewriteMarkdownImagesForEmbed(processed, raw, page.path, {
    siteOrigin,
    docsRelativePaths: options?.docsRelativeImagePaths,
  });
  const body = stripTocOnlyHeadings(rewritten);

  return `# ${page.data.title} (${page.url})

${body}`;
}

/**
 * 嵌入导出: 图片 URL 指向魔方 `/docsResources?path=...` (需传入 cubeOrigin)
 */
export async function getEmbedMarkdown(
  page: (typeof source)['$inferPage'],
  cubeOrigin: string | null,
): Promise<string> {
  const [processed, raw] = await Promise.all([
    page.data.getText('processed'),
    page.data.getText('raw'),
  ]);
  const rewritten = rewriteMarkdownImagesForEmbed(processed, raw, page.path, {
    cubeOrigin,
  });
  const body = stripTocOnlyHeadings(rewritten);
  return `# ${page.data.title} (${page.url})\n\n${body}`;
}
