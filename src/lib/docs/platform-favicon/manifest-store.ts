import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PlatformIconManifest } from '@/lib/docs/platform-favicon/types';
import { sharedResourceUrl } from '@/lib/docs/icons/shared-resource-url';

const MANIFEST_PATH = path.join(
  process.cwd(),
  process.env.DOCS_FAVICON_MANIFEST_PATH?.trim() ||
    'content/docs/_public/_shared/platform/icons.json',
);

let cached:
  | {
      mtimeMs: number;
      data: PlatformIconManifest | null;
    }
  | undefined;

export function loadPlatformIconManifest(): PlatformIconManifest | null {
  try {
    const { mtimeMs } = statSync(MANIFEST_PATH);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.data;
    }

    const raw = readFileSync(MANIFEST_PATH, 'utf8');
    const data = JSON.parse(raw) as PlatformIconManifest;
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

/** @deprecated 使用 loadPlatformIconManifest */
export const loadPlatformFaviconManifest = loadPlatformIconManifest;

export function platformIconResourceUrl(relativeFile: string): string {
  return sharedResourceUrl(relativeFile);
}

/** @deprecated 使用 platformIconResourceUrl */
export const platformFaviconResourceUrl = platformIconResourceUrl;

/**
 * 根据 platform icon CODE（如 `QIANNIU`）查找站内资源 URL。
 */
export function getPlatformIconUrl(
  code: string | undefined | null,
): string | undefined {
  const normalized = code?.trim();
  if (!normalized) return undefined;
  const manifest = loadPlatformIconManifest();
  const entry = manifest?.icons[normalized];
  if (!entry?.file) return undefined;
  return platformIconResourceUrl(entry.file);
}

/** @deprecated 使用 getPlatformIconUrl */
export const getCachedPlatformIconByCode = getPlatformIconUrl;
