/**
 * 服务端：加载 shared-icons.json manifest（mtime 缓存，热更新友好）。
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { SharedIconManifest } from '@/lib/docs/shared-icons/types';

/**
 * Shared icons manifest 路径。
 * 通过 DOCS_SHARED_ICONS_MANIFEST_PATH 配置（相对 process.cwd()）；
 * 默认 `content/docs/_public/_shared/shared-icons.json`。
 */
const MANIFEST_PATH = path.join(
  process.cwd(),
  process.env.DOCS_SHARED_ICONS_MANIFEST_PATH?.trim() ||
    'content/docs/_public/_shared/shared-icons.json',
);

import { sharedResourceUrl } from '@/lib/docs/icons/shared-resource-url';

let cached:
  | { mtimeMs: number; data: SharedIconManifest | null }
  | undefined;

function loadManifest(): SharedIconManifest | null {
  try {
    const { mtimeMs } = statSync(MANIFEST_PATH);
    if (cached && cached.mtimeMs === mtimeMs) return cached.data;
    const raw = readFileSync(MANIFEST_PATH, 'utf8');
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
