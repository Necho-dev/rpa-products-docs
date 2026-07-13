import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { NextResponse } from 'next/server';
import {
  resourcesPublicPrefixes,
  resourcesRequireEmbedSign,
} from '@/lib/auth/auth-config';
import { verifyResourceRequest } from '@/lib/auth/sign-resource';
import {
  isBlockedUserAgent,
  isUserAgentGateEnabled,
  userAgentForbiddenResponse,
} from '@/lib/auth/user-agent-gate';

export const runtime = 'nodejs';

/**
 * 路由根目录：content/docs/
 *
 * URL 与文件系统映射规则：
 *
 *   /resources/images/{relative}  →  content/docs/{relative}
 *
 * 示例：
 * - `/resources/images/_public/_shared/platform/files/DEWU.png`
 *     → `content/docs/_public/_shared/platform/files/DEWU.png`（全局共享图标）
 * - `/resources/images/rpa/_public/images/qianniu/foo.png`
 *     → `content/docs/rpa/_public/images/qianniu/foo.png`（rpa 项目图片）
 * - `/resources/images/auth/_public/images/ACCOUNT_PASSWORD/RPA_DOUDIAN/foo.png`
 *     → `content/docs/auth/_public/images/ACCOUNT_PASSWORD/RPA_DOUDIAN/foo.png`（auth 项目图片）
 *
 * Markdown 中的相对图片路径（如 `../_public/images/dewu/foo.png`）经
 * resolveDocRelativeImagePath 展开后已带项目前缀，直接命中上述规则。
 *
 * 安全限制：只允许访问图片扩展名文件，防止 .md / .json 等文档源码泄露。
 */
const DOCS_BASE_DIR = join(process.cwd(), 'content', 'docs');

/**
 * 仅允许访问的图片扩展名白名单（防止 .md/.json 等非图片文件被访问）。
 */
const ALLOWED_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico']);

/** 根据扩展名返回 Content-Type */
function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

function isPublicResourceRelativePath(relative: string): boolean {
  const prefixes = resourcesPublicPrefixes();
  if (prefixes.length === 0) return false;
  const normalized = relative.replace(/^\/+/, '');
  return prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export async function GET(
  req: Request,
  { params }: RouteContext<'/resources/images/[...path]'>,
) {
  if (isUserAgentGateEnabled() && isBlockedUserAgent(req.headers.get('user-agent'))) {
    return userAgentForbiddenResponse();
  }

  const { path } = await params;
  if (!path || path.length === 0) {
    return new NextResponse('not found', { status: 404 });
  }

  const ext = (path[path.length - 1]?.split('.').pop() ?? '').toLowerCase();

  // 扩展名白名单：只允许图片文件，防止文档源码（.md/.json）被访问
  if (!ALLOWED_IMAGE_EXTS.has(ext)) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const relative = path.join('/');

  if (resourcesRequireEmbedSign() && !isPublicResourceRelativePath(relative)) {
    if (!verifyResourceRequest(req)) {
      return NextResponse.json(
        { error: 'unauthorized', message: '访问资源请携带有效的 BFF 签名' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }
  }

  // 防路径穿越：规范化后必须仍在 DOCS_BASE_DIR 内
  const resolved = normalize(join(DOCS_BASE_DIR, relative));
  if (!resolved.startsWith(DOCS_BASE_DIR + '/') && resolved !== DOCS_BASE_DIR) {
    return new NextResponse('forbidden', { status: 403 });
  }

  let data: Buffer | undefined;
  let lastErr: NodeJS.ErrnoException | undefined;
  try {
    data = await readFile(resolved);
  } catch (err) {
    lastErr = err as NodeJS.ErrnoException;
    if (lastErr.code !== 'ENOENT') throw err;
  }

  if (!data) {
    if (lastErr?.code === 'ENOENT') {
      return new NextResponse('not found', { status: 404 });
    }
    return new NextResponse('forbidden', { status: 403 });
  }

  const cacheControl = resourcesRequireEmbedSign()
    ? 'private, no-store'
    : 'public, max-age=86400, stale-while-revalidate=604800';

  return new NextResponse(data.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': mimeFromExt(ext),
      'Cache-Control': cacheControl,
    },
  });
}
