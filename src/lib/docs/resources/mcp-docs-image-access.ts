import {
  isPrivateDocAccessConfigured,
  type DocAccessContext,
} from '@/lib/docs/access/doc-access';
import {
  extractLocalMarkdownImagePaths,
  resolveDocRelativeImagePath,
} from '@/lib/docs/embed/markdown';
import { normalizeDocsImageRelativePath } from '@/lib/docs/resources/read-docs-image';

export type McpDocsImagePageRef = {
  /** content/docs 文件路径，用于解析图片相对引用 */
  path: string;
  /** 文档 URL（如 /docs/rpa/...），供页级 private 目录继承判断 */
  url: string;
  data: {
    access?: string;
    getText: (type: 'raw') => Promise<string>;
  };
};

export type McpDocsImageAccessResult =
  | { ok: true; relativePath: string }
  | { ok: false; error: string; status: 400 | 403 };

export type AuthorizeMcpDocsImageAccessOptions = {
  /** 文档页路径；遗留 PRIVATE_ACCESS_TOKEN 未授权时必填 */
  pagePath?: string;
  resolvePage?: (path: string) => McpDocsImagePageRef | undefined;
  isPageAccessible?: (
    page: McpDocsImagePageRef,
    access: DocAccessContext,
  ) => boolean;
};

/**
 * get_docs_image 访问控制（与「能读文档才能读图」对齐）：
 *
 * - 未启用私有门槛 / 已持有私有访问（SSO Bearer 或 PRIVATE_ACCESS_TOKEN）→ 放行
 * - 否则必须提供可访问的 `page`，且图片出现在该页 raw Markdown 中
 *
 * SSO 入口门禁仍由 `/mcp` 负责；本函数处理工具级页绑定。
 */
export async function authorizeMcpDocsImageAccess(
  imagePathOrUrl: string,
  access: DocAccessContext,
  options: AuthorizeMcpDocsImageAccessOptions = {},
): Promise<McpDocsImageAccessResult> {
  const relativePath = normalizeDocsImageRelativePath(imagePathOrUrl);
  if (!relativePath) {
    return { ok: false, error: 'invalid image path', status: 400 };
  }

  if (access.canAccessPrivate || !isPrivateDocAccessConfigured()) {
    return { ok: true, relativePath };
  }

  const pageRef = options.pagePath?.trim();
  if (!pageRef) {
    return {
      ok: false,
      error:
        'Forbidden: pass page= (docs path you can read via get_docs_content) to fetch this image',
      status: 403,
    };
  }

  const resolvePage = options.resolvePage;
  const isPageAccessible = options.isPageAccessible;
  if (!resolvePage || !isPageAccessible) {
    return {
      ok: false,
      error: 'Forbidden: page access resolver unavailable',
      status: 403,
    };
  }

  const page = resolvePage(pageRef);
  if (!page || !isPageAccessible(page, access)) {
    return {
      ok: false,
      error: 'Forbidden: page not found or not accessible',
      status: 403,
    };
  }

  const raw = await page.data.getText('raw');
  const referenced = extractLocalMarkdownImagePaths(raw).some(
    (src) => resolveDocRelativeImagePath(src, page.path) === relativePath,
  );
  if (!referenced) {
    return {
      ok: false,
      error: 'Forbidden: image is not referenced by the given accessible page',
      status: 403,
    };
  }

  return { ok: true, relativePath };
}
