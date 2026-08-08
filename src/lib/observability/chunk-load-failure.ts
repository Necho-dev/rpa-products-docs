/** 识别部署换构建后常见的动态 import / chunk 加载失败 */
export function isChunkLoadFailure(reason: unknown): boolean {
  if (!reason) return false;

  const name =
    typeof reason === 'object' && reason !== null && 'name' in reason
      ? String((reason as { name?: unknown }).name ?? '')
      : '';
  const message =
    typeof reason === 'string'
      ? reason
      : typeof reason === 'object' && reason !== null && 'message' in reason
        ? String((reason as { message?: unknown }).message ?? '')
        : '';

  if (name === 'ChunkLoadError') return true;

  const lower = message.toLowerCase();
  return (
    lower.includes('loading chunk') ||
    lower.includes('chunkloaderror') ||
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module')
  );
}
