/** 共享静态资源 URL 前缀（对应 content/docs/_public/_shared/） */
export const SHARED_RESOURCE_PREFIX = '_public/_shared';

export function sharedResourceUrl(relativeFile: string): string {
  const cleaned = relativeFile.replace(/^\/+/, '');
  return `/resources/images/${SHARED_RESOURCE_PREFIX}/${cleaned}`;
}
