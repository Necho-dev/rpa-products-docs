import { filterCoverTags } from '@/lib/docs/og/cover-tags';
import { loadHeroImageAsset } from '@/lib/docs/og/hero-image';
import type { OgCoverProps } from '@/lib/docs/og/types';
import {
  readLeafCategoryKey,
  readMetaCategoryAxis,
} from '@/lib/docs/source/category-config';
import { readDocsMetaJson } from '@/lib/docs/source/meta-pages-order';
import { source } from '@/lib/docs/source/source';

type Page = (typeof source)['$inferPage'];

type PageExtras = {
  tags?: string[];
  category?: unknown;
};

function resolveParentGroupContext(page: Page): {
  label?: string;
  icon?: { comp: string; color?: string };
} {
  const parentSlugs = page.slugs.slice(0, -1);
  if (parentSlugs.length === 0) return {};

  const axis = readMetaCategoryAxis(readDocsMetaJson(parentSlugs.join('/')));
  const data = page.data as PageExtras;
  const key = readLeafCategoryKey(data.category);
  if (!key) return {};

  const catalog = axis.items ?? [];
  const def =
    catalog.find((row) => row.key === key) ??
    catalog.find((row) => row.item === key);
  if (!def) return {};

  return {
    label: def.item,
    icon: def.icon,
  };
}

export async function buildOgCoverProps(page: Page): Promise<OgCoverProps> {
  const raw = await page.data.getText('raw');
  const data = page.data as PageExtras;
  const parentCtx = resolveParentGroupContext(page);
  const heroImage = await loadHeroImageAsset(page.path, raw);
  const tags = filterCoverTags(data.tags, parentCtx.label);

  return {
    heroImageDataUrl: heroImage?.dataUrl,
    tags: tags.length > 0 ? tags : undefined,
    groupIcon: heroImage ? undefined : parentCtx.icon,
  };
}
