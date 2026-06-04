import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute, getPublicSiteUrl } from '@/lib/core/shared';
import { docsEntryInSidebarPlugin } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';
import { rewriteMarkdownImagesForEmbed } from '@/lib/docs/embed/markdown';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin(), docsEntryInSidebarPlugin()],
});

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

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

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}

/**
 * 嵌入导出：返回 LLM Markdown 文本，并将图片路径重写为绝对 `/resources/images/...` HTTP URL。
 * 适用于 X-Render-Mode: markdown 通道，图片在外部 iframe 中可直接访问。
 */
export async function getEmbedMarkdown(
  page: (typeof source)['$inferPage'],
  siteOrigin?: string,
): Promise<string> {
  const [processed, raw] = await Promise.all([
    page.data.getText('processed'),
    page.data.getText('raw'),
  ]);
  const origin = siteOrigin ?? getPublicSiteUrl();
  const body = rewriteMarkdownImagesForEmbed(processed, raw, page.path, origin);
  return `# ${page.data.title} (${page.url})\n\n${body}`;
}
