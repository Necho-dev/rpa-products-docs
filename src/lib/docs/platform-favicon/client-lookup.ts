/**
 * 客户端可用的平台 favicon 查找（直接 import manifest JSON，无 fs / server-only）。
 * 供 module-grid tabs、卡片 icon.comp 等 client 组件使用。
 */
import manifest from '../../../../content/docs/public/_shared/platform-favicons.json';
import type { PlatformFaviconManifest } from '@/lib/docs/platform-favicon/types';

const data = manifest as PlatformFaviconManifest;

function resourceUrl(relativeFile: string): string {
  const cleaned = relativeFile.replace(/^\/+/, '');
  return `/resources/images/public/_shared/${cleaned}`;
}

/**
 * 按 manifest `codes`（如 `RPA_QIANNIU`、`TAOBAO`）查找站内 favicon URL。
 */
export function getPlatformIconByCode(
  code: string | undefined | null,
): string | undefined {
  const normalized = code?.trim();
  if (!normalized) return undefined;

  for (const entry of Object.values(data.icons ?? {})) {
    if (!entry?.file || !Array.isArray(entry.codes)) continue;
    if (entry.codes.includes(normalized)) {
      return resourceUrl(entry.file);
    }
  }
  return undefined;
}
