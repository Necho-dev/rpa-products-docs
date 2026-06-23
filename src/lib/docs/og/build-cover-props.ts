import { filterCoverTags } from '@/lib/docs/og/cover-tags';
import { loadHeroImageAsset } from '@/lib/docs/og/hero-image';
import type { OgCoverProps } from '@/lib/docs/og/types';
import {
  resolveModuleGroupYamlContext,
  slugBasename,
} from '@/lib/docs/source/collect-sibling-modules';
import { parseModuleGridBlockFromRaw } from '@/lib/docs/source/module-group-config';
import { source } from '@/lib/docs/source/source';

type Page = (typeof source)['$inferPage'];

type PageExtras = {
  entry?: string;
  tags?: string[];
  moduleGroup?: string;
};

async function resolveParentGroupContext(page: Page) {
  const parentSlugs = page.slugs.slice(0, -1);
  if (parentSlugs.length === 0) return {};

  const indexPage = source.getPage(parentSlugs);
  if (!indexPage) return {};

  let indexRaw: string;
  try {
    indexRaw = await indexPage.data.getText('raw');
  } catch {
    return {};
  }

  const parsed = parseModuleGridBlockFromRaw(indexRaw, indexPage.path);
  if (!parsed) return {};

  const packageEntry =
    ((indexPage.data as PageExtras).entry?.trim()) || slugBasename(parentSlugs);

  return resolveModuleGroupYamlContext({
    slug: slugBasename(page.slugs),
    moduleGroup: (page.data as PageExtras).moduleGroup,
    packageEntry,
    groupsYaml: parsed.groups,
  });
}

export async function buildOgCoverProps(page: Page): Promise<OgCoverProps> {
  const raw = await page.data.getText('raw');
  const [heroImage, parentCtx] = await Promise.all([
    loadHeroImageAsset(page.path, raw),
    resolveParentGroupContext(page),
  ]);

  const data = page.data as PageExtras;
  const tags = filterCoverTags(data.tags, parentCtx.label);

  return {
    heroImageDataUrl: heroImage?.dataUrl,
    tags: tags.length > 0 ? tags : undefined,
    groupIcon: heroImage ? undefined : parentCtx.icon,
  };
}
