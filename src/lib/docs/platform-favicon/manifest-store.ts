import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PlatformIconManifest } from '@/lib/docs/platform-favicon/types';
import { platformIconLookupKey } from '@/lib/docs/icons/icon-code';
import { sharedResourceUrl } from '@/lib/docs/icons/shared-resource-url';

/**
 * 默认路径用字面量子目录拼接，避免 Turbopack NFT 把整个 cwd 打进 middleware 包。
 * DOCS_FAVICON_MANIFEST_PATH 可覆盖（绝对路径或相对 cwd）。
 */
function resolveManifestPath(): string {
  const override = process.env.DOCS_FAVICON_MANIFEST_PATH?.trim();
  if (override) {
    return path.isAbsolute(override)
      ? override
      : path.join(/* turbopackIgnore: true */ process.cwd(), override);
  }
  return path.join(
    process.cwd(),
    'content',
    'docs',
    '_public',
    '_shared',
    'platform',
    'icons.json',
  );
}

const MANIFEST_PATH = resolveManifestPath();

let cached:
  | {
      mtimeMs: number;
      data: PlatformIconManifest | null;
    }
  | undefined;

export function loadPlatformIconManifest(): PlatformIconManifest | null {
  try {
    const manifestPath = MANIFEST_PATH;
    const { mtimeMs } = statSync(/* turbopackIgnore: true */ manifestPath);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.data;
    }

    const raw = readFileSync(/* turbopackIgnore: true */ manifestPath, 'utf8');
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
 * 根据 platform icon CODE（如 `ICO_QIANNIU`）查找站内资源 URL。
 */
export function getPlatformIconUrl(
  code: string | undefined | null,
): string | undefined {
  const key = platformIconLookupKey(code);
  if (!key) return undefined;
  const manifest = loadPlatformIconManifest();
  const entry = manifest?.icons[key];
  if (!entry?.file) return undefined;
  return platformIconResourceUrl(entry.file);
}

/** @deprecated 使用 getPlatformIconUrl */
export const getCachedPlatformIconByCode = getPlatformIconUrl;
