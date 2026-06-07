import { docsRoute } from '@/lib/core/shared';
import type { DocHighlight } from '@/lib/docs/selection/highlight-idb';

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function titleFromPagePath(pagePath: string): string {
  if (pagePath === docsRoute) return '文档首页';
  const rest = pagePath.startsWith(`${docsRoute}/`)
    ? pagePath.slice(`${docsRoute}/`.length)
    : pagePath;
  const segments = rest.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  return last ? slugToTitle(last) : pagePath;
}

export function resolveHighlightPageTitle(h: DocHighlight): string {
  const trimmed = h.pageTitle?.trim();
  if (trimmed) return trimmed;
  return titleFromPagePath(h.pagePath);
}

export function formatHighlightCreatedAt(createdAt: number): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}
