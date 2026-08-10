import { posix } from 'node:path';

/**
 * 将 `processed` Markdown 文本中的图片转换为可访问路径/URL:
 *
 * - 嵌入 + 有 `cubeOrigin`: `{cubeOrigin}/docsResources?path=...` (浏览器经魔方会话拉取)
 * - MCP（`docsRelativePaths`）: `content/docs` 相对路径，读图走 `get_docs_image`
 * - 人类导出（`llms.mdx` 等）: `{siteOrigin}/resources/images/...`
 *
 * `path` 为相对 `content/docs/` 的路径 (和 remark-image / raw 对齐)
 */

const RESOURCES_IMAGES_PREFIX = '/resources/images';
const DOCS_RESOURCES_PATH = '/docsResources';

export type EmbedImageRewriteOptions = {
  /** 魔方来源站根 URL; 嵌入通道必填方可输出图片 */
  cubeOrigin?: string | null;
  /** 文档站根 URL; 非嵌入或回退时使用 */
  siteOrigin?: string | null;
  /**
   * 输出 `content/docs` 相对路径（如 `rpa/_public/images/foo.png`）。
   * MCP 正文使用；配合 `get_docs_image` 取二进制。
   */
  docsRelativePaths?: boolean;
};

/**
 * 将相对于文档文件的图片路径 resolve 为相对于 `content/docs/` 的路径
 */
export function resolveDocRelativeImagePath(relativePath: string, docPath: string): string {
  const docDir = posix.dirname(docPath.replace(/^\/+/, ''));
  return posix.normalize(posix.join(docDir, relativePath));
}

function buildImageUrl(
  resolved: string,
  options: EmbedImageRewriteOptions,
): string | null {
  const cube = options.cubeOrigin?.replace(/\/$/, '');
  if (cube) {
    return `${cube}${DOCS_RESOURCES_PATH}?path=${encodeURIComponent(resolved)}`;
  }
  // 嵌入通道显式传入 null/空 cubeOrigin：不输出图片，避免错落到站内 /resources
  if (options.cubeOrigin === null || options.cubeOrigin === '') {
    return null;
  }
  if (options.docsRelativePaths) {
    return resolved;
  }
  const site = options.siteOrigin?.replace(/\/$/, '') || null;
  if (!site) return `${RESOURCES_IMAGES_PREFIX}/${resolved}`;
  return `${site}${RESOURCES_IMAGES_PREFIX}/${resolved}`;
}

/** 从原始 Markdown 按序提取本地图片路径（跳过 http/https） */
export function extractLocalMarkdownImagePaths(rawText: string): string[] {
  const paths: string[] = [];
  const imageRegex = /!\[(?:[^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(rawText)) !== null) {
    const src = match[1];
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      paths.push(src);
    }
  }
  return paths;
}

/**
 * 将 `processed` Markdown 中的 `src="__imgN"` 占位符替换为路径/URL
 */
function replaceImgPlaceholders(
  processedText: string,
  rawPaths: string[],
  docPath: string,
  options: EmbedImageRewriteOptions,
): string {
  return processedText.replace(
    /<img\s[^>]*src="(__img\d+)"[^>]*\/?>/gi,
    (tag, placeholder) => {
      const index = parseInt(placeholder.replace('__img', ''), 10);
      const rawPath = rawPaths[index];
      if (!rawPath) return tag;
      const resolved = resolveDocRelativeImagePath(rawPath, docPath);
      const absUrl = buildImageUrl(resolved, options);
      // 嵌入缺 cubeOrigin：去掉坏图，与历史 fail-closed 一致
      if (!absUrl) return '';
      return tag.replace(`src="${placeholder}"`, `src="${absUrl}"`);
    },
  );
}

/**
 * 将 `processed` Markdown 中遗留的相对路径 Markdown 图片转为路径/URL (兜底)
 */
function replaceRelativeMarkdownImages(
  text: string,
  docPath: string,
  options: EmbedImageRewriteOptions,
): string {
  return text.replace(
    /!\[([^\]]*)\]\(((?:\.\.?\/)[^)]+)\)/g,
    (_m, alt, src) => {
      const resolved = resolveDocRelativeImagePath(src, docPath);
      const absUrl = buildImageUrl(resolved, options);
      if (!absUrl) return `![${alt}](${src})`;
      return `![${alt}](${absUrl})`;
    },
  );
}

/**
 * 对导出 Markdown 进行图片路径重写：
 * - `__imgN` 占位符 → 按 options 输出 docsResources / 绝对资源 URL / docs 相对路径
 * - 遗留相对路径 → 同上 (兜底)
 */
export function rewriteMarkdownImagesForEmbed(
  processedText: string,
  rawText: string,
  docPath: string,
  options: EmbedImageRewriteOptions,
): string {
  const rawPaths = extractLocalMarkdownImagePaths(rawText);
  let result = replaceImgPlaceholders(processedText, rawPaths, docPath, options);
  result = replaceRelativeMarkdownImages(result, docPath, options);
  return result;
}
