import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

const DOCS_BASE_DIR = join(process.cwd(), 'content', 'docs');
const RESOURCES_IMAGES_PREFIX = '/resources/images/';

export const DOCS_IMAGE_ALLOWED_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'ico',
]);

/** MCP 单图上限，避免过大截图撑爆 tool 响应 */
export const DOCS_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export function mimeFromImageExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 将绝对资源 URL / `/resources/images/...` / `content/docs` 相对路径
 * 规范为 `content/docs` 下相对路径（不含前导 /）。
 */
export function normalizeDocsImageRelativePath(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let pathPart = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      pathPart = new URL(raw).pathname;
    }
  } catch {
    return null;
  }

  pathPart = pathPart.split('?')[0]?.split('#')[0] ?? pathPart;
  if (pathPart.startsWith(RESOURCES_IMAGES_PREFIX)) {
    pathPart = pathPart.slice(RESOURCES_IMAGES_PREFIX.length);
  }
  pathPart = pathPart.replace(/^\/+/, '');
  if (!pathPart || pathPart.includes('\0')) return null;

  const normalized = normalize(pathPart).replace(/\\/g, '/');
  if (normalized.startsWith('../') || normalized === '..' || normalized.startsWith('/')) {
    return null;
  }
  return normalized;
}

export type ReadDocsImageResult =
  | { ok: true; relativePath: string; mimeType: string; data: Buffer }
  | { ok: false; error: string; status: 400 | 403 | 404 | 413 };

export async function readDocsImageFile(
  inputPathOrUrl: string,
): Promise<ReadDocsImageResult> {
  const relative = normalizeDocsImageRelativePath(inputPathOrUrl);
  if (!relative) {
    return { ok: false, error: 'invalid image path', status: 400 };
  }

  const ext = relative.split('.').pop()?.toLowerCase() ?? '';
  if (!DOCS_IMAGE_ALLOWED_EXTS.has(ext)) {
    return { ok: false, error: 'unsupported image type', status: 403 };
  }

  const resolved = normalize(join(DOCS_BASE_DIR, relative));
  if (!resolved.startsWith(DOCS_BASE_DIR + '/') && resolved !== DOCS_BASE_DIR) {
    return { ok: false, error: 'forbidden', status: 403 };
  }

  let data: Buffer;
  try {
    data = await readFile(resolved);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { ok: false, error: 'image not found', status: 404 };
    }
    throw err;
  }

  if (data.byteLength > DOCS_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `image too large (max ${DOCS_IMAGE_MAX_BYTES} bytes)`,
      status: 413,
    };
  }

  return {
    ok: true,
    relativePath: relative,
    mimeType: mimeFromImageExt(ext),
    data,
  };
}
