import { posix } from 'node:path';

/**
 * 将 `processed` Markdown 文本中的图片转换为绝对 HTTP 可访问 URL：
 *
 * 问题来源：
 * - `remark-image`（`useImport: true`）将 `![alt](../../public/images/foo.png)` 编译为
 *   `<img alt="..." src={__img0} />`（JSX），其中 `__img0` 是 import 变量。
 * - `remarkLLMs` 序列化时，src 值（JS 表达式）直接变为字符串 `__img0`，
 *   输出为 `<img alt="..." src="__img0" />`。
 *
 * 解决思路：
 * 1. 从 `raw` 文本中按序提取 `![alt](relative_path)` 图片定义（与 `__imgN` 索引对齐）。
 * 2. 将 `processed` 文本中的 `src="__imgN"` 替换为绝对 `/resources/images/...` URL。
 * 3. 利用文档自身路径（`docPath`，如 `connectors/rpa-conn-alimm-all/foo.md`）
 *    将任意相对图片路径 resolve 为相对于 `content/docs/` 的最终路径，
 *    从而支持图片放在 `public/images/` 或连接器目录等任意位置。
 *
 * `/resources/images/` 路由已映射到 `content/docs/` 根目录，URL 与文件系统一一对应：
 * - `/resources/images/public/images/qianniu/foo.png`
 *     → `content/docs/public/images/qianniu/foo.png`
 * - `/resources/images/connectors/rpa-conn-alimm-all/foo.png`
 *     → `content/docs/connectors/rpa-conn-alimm-all/foo.png`
 */

const RESOURCES_IMAGES_PREFIX = '/resources/images';

/**
 * 将相对于文档文件的图片路径 resolve 为相对于 `content/docs/` 的路径，
 * 再拼成绝对 `/resources/images/...` URL。
 *
 * @param relativePath  图片相对路径（相对于文档文件所在目录），如 `../../public/images/foo.png`、`./screenshot.png`
 * @param docPath       文档在 `content/docs/` 下的路径，如 `connectors/rpa-conn-alimm-all/foo.md`
 * @param siteOrigin    站点根 URL
 */
function relativePathToResourcesUrl(relativePath: string, docPath: string, siteOrigin: string): string {
  // docPath 示例："connectors/rpa-conn-alimm-all/foo.md"
  // 文档所在目录："connectors/rpa-conn-alimm-all"
  const docDir = posix.dirname(docPath.replace(/^\/+/, ''));
  // resolve 出相对于 content/docs/ 的路径，posix.normalize 去除 ../ 等
  const resolved = posix.normalize(posix.join(docDir, relativePath));
  return `${siteOrigin}${RESOURCES_IMAGES_PREFIX}/${resolved}`;
}

/**
 * 从原始 Markdown 文本中按序提取本地图片路径列表。
 * 顺序与 remark-image 生成的 `__img0`、`__img1`... 对应。
 * 只提取相对路径（跳过 http/https 绝对 URL）。
 */
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
 * 将 `processed` Markdown 中的 `src="__imgN"` 占位符替换为绝对 URL。
 */
function replaceImgPlaceholders(
  processedText: string,
  rawPaths: string[],
  docPath: string,
  siteOrigin: string,
): string {
  return processedText.replace(
    /<img\s[^>]*src="(__img\d+)"[^>]*\/?>/g,
    (tag, placeholder) => {
      const index = parseInt(placeholder.replace('__img', ''), 10);
      const rawPath = rawPaths[index];
      if (!rawPath) return tag;
      const absUrl = relativePathToResourcesUrl(rawPath, docPath, siteOrigin);
      return tag.replace(`src="${placeholder}"`, `src="${absUrl}"`);
    },
  );
}

/**
 * 将 `processed` Markdown 中遗留的相对路径 Markdown 图片转为绝对 URL（兜底处理）。
 * 匹配任意相对路径（以 `./` 或 `../` 开头，或不带协议前缀的路径）。
 */
function replaceRelativeMarkdownImages(text: string, docPath: string, siteOrigin: string): string {
  return text.replace(
    /!\[([^\]]*)\]\(((?:\.\.?\/)[^)]+)\)/g,
    (_m, alt, src) => {
      const absUrl = relativePathToResourcesUrl(src, docPath, siteOrigin);
      return `![${alt}](${absUrl})`;
    },
  );
}

/**
 * 对嵌入导出的 Markdown 文本进行图片 URL 重写：
 * - `__imgN` 占位符 → 绝对 `/resources/images/...` URL
 * - 遗留相对路径 → 同上（兜底）
 *
 * @param processedText  `page.data.getText('processed')` 的输出
 * @param rawText        `page.data.getText('raw')` 的输出（提供原始路径对齐）
 * @param docPath        文档在 `content/docs/` 下的相对路径（`page.path`），如 `connectors/rpa-conn-alimm-all/foo.md`
 * @param siteOrigin     站点根 URL（如 `https://docs.example.com`）
 */
export function rewriteMarkdownImagesForEmbed(
  processedText: string,
  rawText: string,
  docPath: string,
  siteOrigin: string,
): string {
  const rawPaths = extractRawImagePaths(rawText);
  let result = replaceImgPlaceholders(processedText, rawPaths, docPath, siteOrigin);
  result = replaceRelativeMarkdownImages(result, docPath, siteOrigin);
  return result;
}
