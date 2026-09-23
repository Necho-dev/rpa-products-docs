import { posix } from 'node:path';
import { signResourcePath } from '@/lib/auth/resource-sign';

/**
 * 将 `processed` Markdown 文本中的图片转换为可访问 URL:
 *
 * - `signResources`: {siteOrigin}/resources/images/{path}?sign=... (嵌入 llms / MCP / 导出共用)
 * - 否则: {siteOrigin}/resources/images/{path}
 *
 * `path` 为相对 `content/docs/` 的路径 (和 remark-image / raw 对齐)
 */

const RESOURCES_IMAGES_PREFIX = '/resources/images';

export type EmbedImageRewriteOptions = {
  /** 文档站根 URL */
  siteOrigin?: string | null;
  /** 签发短时 ?sign=, 浏览器 / Agent 直连文档站 */
  signResources?: boolean;
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
  const pathname = `${RESOURCES_IMAGES_PREFIX}/${resolved}`;
  if (options.signResources) {
    const signed = signResourcePath(pathname);
    if (!signed) return null;
    const site = options.siteOrigin?.replace(/\/$/, '') || null;
    if (!site) return signed;
    return `${site}${signed}`;
  }

  const site = options.siteOrigin?.replace(/\/$/, '') || null;
  if (!site) return pathname;
  return `${site}${pathname}`;
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
 * - `__imgN` 占位符 → 按 options 输出签名直链 / 绝对资源 URL
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
