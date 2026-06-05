import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

export type HeroImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
};

function mimeFromExt(ext: string): string {
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
    default:
      return 'image/png';
  }
}

function readPngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    const len = buf.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + len;
  }
  return null;
}

function readImageSize(buf: Buffer, ext: string): { width: number; height: number } | null {
  const lower = ext.toLowerCase();
  if (lower === 'png') return readPngSize(buf);
  if (lower === 'jpg' || lower === 'jpeg') return readJpegSize(buf);
  return null;
}

/** 解析 raw markdown 中首张本地配图，返回相对 content/docs 的路径。 */
export function resolveHeroImageRelativePath(pagePath: string, raw: string): string | null {
  const match = raw.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (!match) return null;

  let src = match[1].trim();
  if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return null;
  }

  const docDir = path.dirname(pagePath);
  const resolved = path.normalize(path.join(docDir, src)).replace(/\\/g, '/');
  if (resolved.startsWith('..') || path.isAbsolute(resolved)) return null;

  const ext = resolved.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTS.has(ext)) return null;

  return resolved;
}

/** 按内容区宽度等比计算首图展示高度（完整展示，不裁剪）。 */
export function computeHeroDisplayHeight(
  width: number,
  height: number,
  contentWidth: number,
): number {
  if (width <= 0 || height <= 0) return 0;
  return Math.round((height / width) * contentWidth);
}

/** 读取首张配图并转为 data URL，供 Satori 嵌入。 */
export async function loadHeroImageAsset(
  pagePath: string,
  raw: string,
): Promise<HeroImageAsset | null> {
  const relative = resolveHeroImageRelativePath(pagePath, raw);
  if (!relative) return null;

  const fullPath = path.join(process.cwd(), 'content', 'docs', relative);
  try {
    const buf = await readFile(fullPath);
    const ext = relative.split('.').pop()?.toLowerCase() ?? 'png';
    const mime = mimeFromExt(ext);
    const size = readImageSize(buf, ext) ?? { width: 16, height: 9 };
    return {
      dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
      width: size.width,
      height: size.height,
    };
  } catch {
    return null;
  }
}
