import { docsRoute } from '@/lib/core/shared';
import { readCategory, readMetaCategoryAxis } from '@/lib/docs/source/category-config';
import {
  readMetaCategoryNav,
  type CategoryNavModel,
} from '@/lib/docs/source/category-nav';
import {
  parseMetaPagesOrder,
  readDocsIndexFrontmatter,
  readDocsMetaJson,
  readDocsMetaPagesOrder,
} from '@/lib/docs/source/meta-pages-order';

export function buildCategoryNavModel(
  partitionDir: string,
): CategoryNavModel | null {
  const dir = partitionDir.replace(/^\/+|\/+$/g, '');
  if (!dir) return null;
  const meta = readDocsMetaJson(dir);
  const placement = readMetaCategoryNav(meta);
  if (!placement) return null;
  const axis = readMetaCategoryAxis(meta);
  const items = axis.items;
  if (!items?.length) return null;

  const prefix = `${docsRoute}/${dir}`;
  const known = new Set(items.map((row) => row.key));
  const keyByUrl: Record<string, string> = {};
  for (const folder of readDocsMetaPagesOrder(dir)) {
    const slug = readCategory(
      readDocsIndexFrontmatter(`${dir}/${folder}`)?.category,
    ).slug;
    if (!slug || !known.has(slug)) continue;
    keyByUrl[`${prefix}/${folder}`] = slug;
  }

  return {
    placement,
    title: axis.title?.trim() || '分类',
    prefix,
    items,
    keyByUrl,
  };
}

export function listCategoryNavModels(): CategoryNavModel[] {
  const roots = parseMetaPagesOrder(readDocsMetaJson('')?.pages);
  const out: CategoryNavModel[] = [];
  for (const dir of roots) {
    const model = buildCategoryNavModel(dir);
    if (model) out.push(model);
  }
  return out;
}
