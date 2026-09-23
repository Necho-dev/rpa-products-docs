import { runtimeDocs } from 'collections/dynamic';
import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { getPublicSiteUrlIfSet } from '@/lib/core/knowledge-env';
import { docsContentRoute, docsImageRoute, docsRoute } from '@/lib/core/shared';
import { docIconsPlugin } from '@/lib/docs/source/doc-icons-plugin';
import { docsEntryInSidebarPlugin } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';
import { rewriteMarkdownImagesForEmbed } from '@/lib/docs/embed/markdown';
import { unwrapFdSteps } from '@/lib/docs/llms/unwrap-fd-steps';
import { stripTocOnlyHeadings } from '@/lib/docs/source/scan-sibling-docs';
import { statSync } from 'node:fs';
import type React from 'react';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: {
    docs: docs.toFumadocsSource(),
    runtimeDocs: runtimeDocs.toFumadocsSource(),
  },
  plugins: [docIconsPlugin(), docsEntryInSidebarPlugin(), openapiPlugin()],
});

type DocPage = (typeof source)['$inferPage'];

function decodeSlug(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * 页面和 generateMetadata 生成的 slug 编码可能不一致
 * 索引里的 slug 是 encodeURI, 对不上时 metadata 里的 notFound() 会在正文流出之后把整页换成 404
 */
export function getDocPage(slugs: string[] | undefined): DocPage | undefined {
  const base = slugs ?? [];
  const decoded = base.map(decodeSlug);
  const variants = [base, decoded, decoded.map((segment) => encodeURI(segment))];
  const seen = new Set<string>();
  for (const variant of variants) {
    const key = variant.join('\0');
    if (seen.has(key)) continue;
    seen.add(key);
    const page = source.getPage(variant);
    if (page) return page;
  }
  return undefined;
}

type LoadedDocPage = {
  body: (props: { components?: Record<string, unknown> }) => React.ReactNode;
  toc?: { depth: number; url: string; title: React.ReactNode }[];
  structuredData?: {
    headings: { id: string; content: string }[];
    contents: { heading: string; content: string }[];
  };
  lastModified?: Date;
};

/** 运行时分区第一次 load() 时编译正文, 构建期分区已经编好 */
export async function readDocsPage(page: DocPage): Promise<LoadedDocPage> {
  const data = page.data as LoadedDocPage & {
    load?: () => Promise<LoadedDocPage>;
  };
  if (typeof data.load === 'function') return data.load();
  return data;
}

/** 列表、RSS、OG 用文件时间, 避免为了日期把正文编译一遍 */
export function docUpdatedAt(page: DocPage): Date | undefined {
  try {
    return statSync(page.data.info.fullPath).mtime;
  } catch {
    return undefined;
  }
}

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
  /** 站点根 URL；正文图片写成绝对 `/resources/images/...?sign=` */
  siteOrigin?: string | null;
};

/**
 * LLM / MCP / llms.mdx 导出文本。
 * fumadocs remark-image 会把本地图编成 `src="__imgN"`，此处按 raw 路径还原并签发短时 `?sign=`。
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
    signResources: true,
  });
  const body = stripTocOnlyHeadings(unwrapFdSteps(rewritten));

  return `# ${page.data.title} (${page.url})

${body}`;
}

/**
 * 嵌入 / MCP 共用：图片写成文档站绝对 URL + 短时 `?sign=`
 */
export async function getEmbedMarkdown(
  page: (typeof source)['$inferPage'],
  options: { siteOrigin: string },
): Promise<string> {
  return getLLMText(page, { siteOrigin: options.siteOrigin });
}
