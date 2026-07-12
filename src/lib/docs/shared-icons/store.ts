/**
 * 服务端：加载 shared-icons.json manifest（mtime 缓存，热更新友好）。
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { SharedIconManifest } from '@/lib/docs/shared-icons/types';

/**
 * Shared icons manifest 路径。
 * 通过 DOCS_SHARED_ICONS_MANIFEST_PATH 配置（绝对路径，或相对 process.cwd()）；
 * 默认 `content/docs/_public/_shared/shared-icons.json`。
 *
 * 默认路径用字面量子目录拼接，避免 Turbopack NFT 把整个 cwd 打进 middleware 包。
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
 */
function resolveManifestPath(): string {
  const override = process.env.DOCS_SHARED_ICONS_MANIFEST_PATH?.trim();
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
    'shared-icons.json',
  );
}

const MANIFEST_PATH = resolveManifestPath();

import { sharedResourceUrl } from '@/lib/docs/icons/shared-resource-url';

let cached:
  | { mtimeMs: number; data: SharedIconManifest | null }
  | undefined;

function loadManifest(): SharedIconManifest | null {
  try {
    const manifestPath = MANIFEST_PATH;
    const { mtimeMs } = statSync(/* turbopackIgnore: true */ manifestPath);
    if (cached && cached.mtimeMs === mtimeMs) return cached.data;
    const raw = readFileSync(/* turbopackIgnore: true */ manifestPath, 'utf8');
    const data = JSON.parse(raw) as SharedIconManifest;
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

/**
 * 根据 icon name（如 `MyBrand`）返回站内资源 URL；未命中返回 undefined。
 */
export function getSharedIconUrl(name: string | undefined | null): string | undefined {
  const normalized = name?.trim();
  if (!normalized) return undefined;
  const manifest = loadManifest();
  if (!manifest) return undefined;
  const entry = manifest.icons[normalized];
  if (!entry?.file) return undefined;
  return sharedResourceUrl(entry.file);
}
