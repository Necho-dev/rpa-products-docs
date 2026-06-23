import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from '@/lib/core/shared';
import { docsEntryInSidebarPlugin } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';
import { rewriteMarkdownImagesForEmbed } from '@/lib/docs/embed/markdown';
import { stripTocOnlyHeadings } from '@/lib/docs/source/module-grid-fs-scan';

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

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');
  const body = stripTocOnlyHeadings(processed);

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
