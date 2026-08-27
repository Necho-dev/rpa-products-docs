import {
  normalizeModuleIcon,
  type ModuleIconConfig,
} from '@/lib/docs/source/module-icon-config';

export type CategoryItemDef = {
  key: string;
  item: string;
  icon?: ModuleIconConfig;
};

/** 目录 meta.json `categoryAxis`：本层如何筛子节点 */
export type CategoryAxis = {
  /** 筛选行名，如「生态」「子平台」「业务场景」 */
  title?: string;
  /** 同目录叶子的虚拟分组词表 */
  items?: CategoryItemDef[];
};

/**
 * 页面 frontmatter `category`：本节点身份 / 叶子归属。
 * 枢纽：slug + icon + link（item 可覆盖芯片文案，默认用页面 title）
 * 叶子：`category: key` 或 `{ slug, icon? }`
 */
export type CategoryIdentity = {
  slug?: string;
  item?: string;
  icon?: ModuleIconConfig;
  link?: string;
};

export type FolderPathSegment = {
  slug: string;
  axisTitle: string;
  item: string;
  icon?: ModuleIconConfig;
};

function readCategoryItems(value: unknown): CategoryItemDef[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: CategoryItemDef[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const obj = row as Record<string, unknown>;
    const key = typeof obj.key === 'string' ? obj.key.trim() : '';
    const item = typeof obj.item === 'string' ? obj.item.trim() : '';
    if (!key || !item || seen.has(key)) continue;
    seen.add(key);
    const icon = normalizeModuleIcon(obj.icon);
    out.push({
      key,
      item,
      ...(icon ? { icon } : {}),
    });
  }
  return out.length > 0 ? out : undefined;
}

export function readCategoryAxis(value: unknown): CategoryAxis {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : undefined;
  const items = readCategoryItems(obj.items);
  return {
    ...(title ? { title } : {}),
    ...(items ? { items } : {}),
  };
}

export function readMetaCategoryAxis(
  meta: Record<string, unknown> | null | undefined,
): CategoryAxis {
  return readCategoryAxis(meta?.categoryAxis);
}

export function readCategory(value: unknown): CategoryIdentity {
  if (typeof value === 'string') {
    const slug = value.trim();
    return slug ? { slug } : {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const slug =
    typeof obj.slug === 'string' && obj.slug.trim()
      ? obj.slug.trim()
      : undefined;
  const item =
    typeof obj.item === 'string' && obj.item.trim()
      ? obj.item.trim()
      : undefined;
  const icon = normalizeModuleIcon(obj.icon);
  const link =
    typeof obj.link === 'string' && obj.link.trim() ? obj.link.trim() : undefined;
  return {
    ...(slug ? { slug } : {}),
    ...(item ? { item } : {}),
    ...(icon ? { icon } : {}),
    ...(link ? { link } : {}),
  };
}

/** 叶子归属 key：`category: crowd` ≡ `{ slug: crowd }`；也认 key/item */
export function readLeafCategoryKey(category: unknown): string | undefined {
  if (typeof category === 'string') {
    const key = category.trim();
    if (key) return key;
  } else if (category && typeof category === 'object' && !Array.isArray(category)) {
    const obj = category as Record<string, unknown>;
    if (typeof obj.slug === 'string' && obj.slug.trim()) return obj.slug.trim();
    if (typeof obj.key === 'string' && obj.key.trim()) return obj.key.trim();
    if (typeof obj.item === 'string' && obj.item.trim()) return obj.item.trim();
  }
  return undefined;
}

/** 叶子卡片图标：`category.icon`，字符串形态没有图标 */
export function readLeafCategoryIcon(category: unknown): ModuleIconConfig | undefined {
  return readCategory(category).icon;
}

/** 另有页面以本 slugs 为前缀且更长 → 本页是目录 index（枢纽），不是连接器叶子 */
export function isHubSlug(
  slugs: readonly string[],
  allSlugs: readonly (readonly string[])[],
): boolean {
  if (slugs.length === 0) return true;
  return allSlugs.some(
    (other) =>
      other.length > slugs.length &&
      slugs.every((seg, i) => other[i] === seg),
  );
}

/** 目录 index.md(x)：无子文档时 isHubSlug 为 false，采集叶子时仍应排除（空子平台）。 */
export function isDocsFolderIndexPath(docsPath: string | undefined): boolean {
  if (!docsPath) return false;
  return /\/index\.mdx?$/i.test(docsPath.replace(/\\/g, '/'));
}

export function slugsStartWith(
  slugs: readonly string[],
  prefix: readonly string[],
): boolean {
  if (slugs.length < prefix.length) return false;
  return prefix.every((seg, i) => slugs[i] === seg);
}

/** 下一级是否还有枢纽 index（达摩盘），用于概览只展示叶子枢纽 */
export function hasChildHubSlug(
  slugs: readonly string[],
  allSlugs: readonly (readonly string[])[],
): boolean {
  return allSlugs.some(
    (other) =>
      other.length === slugs.length + 1 &&
      slugsStartWith(other, slugs) &&
      isHubSlug(other, allSlugs),
  );
}

/** 前缀与叶子文件名之间的文件夹段，如 prefix=ALIMM、page=…/DMP/conn → ['DMP'] */
export function folderSlugsBetween(
  prefix: readonly string[],
  pageSlugs: readonly string[],
): string[] {
  if (pageSlugs.length <= prefix.length + 1) return [];
  return pageSlugs.slice(prefix.length, -1) as string[];
}

export type FolderLookup = {
  axis?: CategoryAxis;
  category?: CategoryIdentity;
  title?: string;
  icon?: string;
};

export function resolveFolderSegment(
  slug: string,
  parent: FolderLookup | undefined,
  self: FolderLookup | undefined,
): FolderPathSegment {
  const axisTitle = parent?.axis?.title?.trim() || '分类';
  const item =
    self?.category?.item?.trim() || self?.title?.trim() || slug;
  const icon =
    self?.category?.icon ??
    (self?.icon?.trim() ? { comp: self.icon.trim() } : undefined);
  return {
    slug,
    axisTitle,
    item,
    ...(icon ? { icon } : {}),
  };
}

export function buildFolderPath(
  prefix: readonly string[],
  pageSlugs: readonly string[],
  lookup: (folderSlugs: string[]) => FolderLookup | undefined,
): FolderPathSegment[] {
  const folders = folderSlugsBetween(prefix, pageSlugs);
  const path: FolderPathSegment[] = [];
  const acc = [...prefix];
  for (const slug of folders) {
    const parent = lookup(acc);
    acc.push(slug);
    path.push(resolveFolderSegment(slug, parent, lookup(acc)));
  }
  return path;
}

/**
 * 概览枢纽路径：生态（一级页面 category.slug + 根目录 categoryAxis）→ 平台 → 子平台。
 * 枢纽 index 的最后一段是目录名，不能当连接器文件名丢掉。
 */
export function buildHubFolderPath(
  prefix: readonly string[],
  pageSlugs: readonly string[],
  lookup: (folderSlugs: string[]) => FolderLookup | undefined,
): FolderPathSegment[] {
  const folders = pageSlugs.slice(prefix.length);
  if (folders.length === 0) return [];

  const root = lookup([...prefix]);
  const first = lookup([...prefix, folders[0]!]);
  const ecoKey = first?.category?.slug?.trim();
  const path: FolderPathSegment[] = [];

  if (ecoKey && root?.axis?.title?.trim()) {
    const catalog = root.axis.items ?? [];
    const def =
      catalog.find((row) => row.key === ecoKey) ??
      catalog.find((row) => row.item === ecoKey);
    const icon = def?.icon ?? first?.category?.icon;
    path.push({
      slug: def?.key ?? ecoKey,
      axisTitle: root.axis.title.trim(),
      item: def?.item ?? ecoKey,
      ...(icon ? { icon } : {}),
    });
  }

  const acc = [...prefix];
  for (let i = 0; i < folders.length; i++) {
    const slug = folders[i]!;
    const parent = lookup(acc);
    acc.push(slug);
    const self = lookup(acc);
    const axisTitle =
      i === 0
        ? '平台'
        : parent?.axis?.title?.trim() || '子平台';
    const item =
      self?.category?.item?.trim() || self?.title?.trim() || slug;
    const icon =
      self?.category?.icon ??
      (self?.icon?.trim() ? { comp: self.icon.trim() } : undefined);
    path.push({
      slug,
      axisTitle,
      item,
      ...(icon ? { icon } : {}),
    });
  }

  return path;
}

/**
 * 同一目录虚拟分组：父目录 categoryAxis.title + items 词表，叶子只给 key。
 */
export function appendLeafCategorySegment(
  path: FolderPathSegment[],
  parent: FolderLookup | undefined,
  leafKey: string | undefined,
  fallbackItem?: string,
): FolderPathSegment[] {
  const axisTitle = parent?.axis?.title?.trim();
  const key = leafKey?.trim();
  if (!axisTitle || !key) return path;

  const catalog = parent?.axis?.items ?? [];
  const def =
    catalog.find((row) => row.key === key) ??
    catalog.find((row) => row.item === key);
  const slug = def?.key ?? key;
  const item = def?.item ?? fallbackItem?.trim() ?? key;
  const icon = def?.icon;

  if (path.some((seg) => seg.axisTitle === axisTitle && seg.slug === slug)) {
    return path;
  }

  return [
    ...path,
    {
      slug,
      axisTitle,
      item,
      ...(icon ? { icon } : {}),
    },
  ];
}

/** 卡片面包屑分段：祖先路径，不含与标题重复的最后一段 */
export function folderPathBreadcrumbParts(
  folderPath: readonly FolderPathSegment[],
  title: string,
): string[] {
  if (folderPath.length === 0) return [];
  const last = folderPath[folderPath.length - 1]!;
  const titleTrim = title.trim();
  const dropLeaf = last.item === titleTrim || last.slug === titleTrim;
  const parts = dropLeaf ? folderPath.slice(0, -1) : folderPath;
  return parts.map((seg) => seg.item);
}

/** 卡片面包屑：祖先路径，不含与标题重复的最后一段；无路径则不展示 */
export function folderPathBreadcrumb(
  folderPath: readonly FolderPathSegment[],
  title: string,
): string | undefined {
  const parts = folderPathBreadcrumbParts(folderPath, title);
  if (parts.length === 0) return undefined;
  return parts.join(' › ');
}
