import 'server-only';

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PlatformFaviconManifest } from '@/lib/docs/platform-favicon/types';
import { normalizeSiteUrl } from '@/lib/docs/platform-favicon/resolve';

const MANIFEST_PATH = path.join(
  process.cwd(),
  'content',
  'docs',
  'public',
  '_shared',
  'platform-favicons.json',
);

let cached:
  | {
      mtimeMs: number;
      data: PlatformFaviconManifest | null;
    }
  | undefined;

function loadManifest(): PlatformFaviconManifest | null {
  try {
    const { mtimeMs } = statSync(MANIFEST_PATH);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.data;
    }

    const raw = readFileSync(MANIFEST_PATH, 'utf8');
    const data = JSON.parse(raw) as PlatformFaviconManifest;
    if (!data?.icons || typeof data.icons !== 'object') {
      cached = { mtimeMs, data: null };
      return null;
    }
    cached = { mtimeMs, data };
    return data;
  } catch {
    cached = { mtimeMs: -1, data: null };
    return null;
  }
}

/** 站内资源路径前缀（对应 content/docs/public/_shared/...） */
export function platformFaviconResourceUrl(relativeFile: string): string {
  const cleaned = relativeFile.replace(/^\/+/, '');
  return `/resources/images/public/_shared/${cleaned}`;
}

/**
 * 根据 platformUrl 返回站内 favicon URL；无映射时返回 undefined。
 */
export function getCachedPlatformIcon(platformUrl: string | undefined | null): string | undefined {
  if (!platformUrl?.trim()) return undefined;
  const manifest = loadManifest();
  if (!manifest) return undefined;

  let key: string;
  try {
    key = normalizeSiteUrl(platformUrl);
  } catch {
    return undefined;
  }

  const entry = manifest.icons[key];
  if (!entry?.file) return undefined;
  return platformFaviconResourceUrl(entry.file);
}
