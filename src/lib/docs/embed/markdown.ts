import { posix } from 'node:path';

/**
 * 将 `processed` Markdown 文本中的图片转换为可访问 URL: 
 *
 * - 嵌入 + 有 `cubeOrigin`: `{cubeOrigin}/docsResources?path=...` (浏览器经魔方会话拉取)
 * - 非嵌入或保留文档站直连: `{siteOrigin}/resources/images/...`
 *
 * `path` 为相对 `content/docs/` 的路径 (和 remark-image / raw 对齐)
 */

const RESOURCES_IMAGES_PREFIX = '/resources/images';
const DOCS_RESOURCES_PATH = '/docsResources';

export type EmbedImageRewriteOptions = {
  /** 魔方来源站根 URL; 嵌入通道必填方可输出图片 */
  cubeOrigin?: string | null;
  /** 文档站根 URL; 非嵌入或回退时使用 */
  siteOrigin?: string;
};

/**
 * 将相对于文档文件的图片路径 resolve 为相对于 `content/docs/` 的路径
 */
export function resolveDocRelativeImagePath(relativePath: string, docPath: string): string {
  const docDir = posix.dirname(docPath.replace(/^\/+/, ''));
  return posix.normalize(posix.join(docDir, relativePath));
}

/**
 * 从原始 Markdown 文本中按序提取本地图片路径列表。
 * 顺序与 remark-image 生成的 `__img0`、`__img1`... 对应。
 * 只提取相对路径（跳过 http/https 绝对 URL）。
 */
function buildImageUrl(
  resolved: string,
  options: EmbedImageRewriteOptions,
): string | null {
  const cube = options.cubeOrigin?.replace(/\/$/, '');
  if (cube) {
    return `${cube}${DOCS_RESOURCES_PATH}?path=${encodeURIComponent(resolved)}`;
  }
  const site = options.siteOrigin?.replace(/\/$/, '');
  if (!site) return null;
  return `${site}${RESOURCES_IMAGES_PREFIX}/${resolved}`;
}

function extractRawImagePaths(rawText: string): string[] {
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
 * 将 `processed` Markdown 中的 `src="__imgN"` 占位符替换为绝对 URL
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
 * 将 `processed` Markdown 中遗留的相对路径 Markdown 图片转为绝对 URL (兜底处理)
 * 匹配任意相对路径 (以 `./` 或 `../` 开头, 或不带协议前缀的路径)
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
 * 对嵌入导出的 Markdown 文本进行图片 URL 重写：
 * - `__imgN` 占位符 → 绝对 `/resources/images/...` URL
 * - 遗留相对路径 → 同上 (兜底)
 *
 * @param processedText  `page.data.getText('processed')` 的输出
 * @param rawText        `page.data.getText('raw')` 的输出 (提供原始路径对齐)
 * @param docPath        文档在 `content/docs/` 下的相对路径（`page.path`），如 `connectors/RPA_ALIMM/foo.md`
 * @param options        图片重写选项, 包含 `cubeOrigin` 和 `siteOrigin`
 */
export function rewriteMarkdownImagesForEmbed(
  processedText: string,
  rawText: string,
  docPath: string,
  options: EmbedImageRewriteOptions,
): string {
  const rawPaths = extractRawImagePaths(rawText);
  let result = replaceImgPlaceholders(processedText, rawPaths, docPath, options);
  result = replaceRelativeMarkdownImages(result, docPath, options);
  return result;
}
