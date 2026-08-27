import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parsePrecedingCategoryFilterHeadingId } from '@/lib/docs/source/doc-block-toc';
import { DEFAULT_CATEGORY_FILTER_PAGE_SIZE } from '@/lib/docs/source/category-filter-pagination';
import type {
  CategoryFilterLayout,
  CategoryFilterPagination,
  CategoryFilterPaginationStyle,
} from '@/lib/docs/source/category-filter-types';

export type ParsedCategoryFilterDirective = {
  cover: boolean;
  /** 是否显示搜索框并对命中文案高亮；未写则开启 */
  search: boolean;
  /** 是否显示筛选轴类目标题（如「子平台」「业务场景」）；未写则显示 */
  labels: boolean;
  /**
   * 采集深度：相对当前页的路径层数（含连接器文件名）。
   * `1` 只收本目录叶子；`2` 收到下一级子目录中的叶子；未写则不限制。
   * 同时截断筛选轴（folderPath）层数。
   */
  depth?: number;
  /** 未写则为芯片级联（landing）；子平台页请显式写 layout: tabs / stack / flat / table */
  layout?: CategoryFilterLayout;
  /**
   * 采集枢纽页（各平台 / 子平台 index）而非连接器叶子。
   * 概览页用 `hubs: true` + `depth: 1` 只收到子平台一层。
   */
  hubs?: boolean;
  pagination: CategoryFilterPagination;
};

const CATEGORY_FILTER_LAYOUTS = new Set<CategoryFilterLayout>([
  'tabs',
  'stack',
  'flat',
  'table',
]);

export function parseCategoryFilterDirectiveYaml(
  raw: unknown,
  filePath: string,
): ParsedCategoryFilterDirective {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      cover: false,
      search: true,
      labels: true,
      pagination: defaultPagination(),
    };
  }
  const obj = raw as Record<string, unknown>;
  let cover = false;
  let search = true;
  let labels = true;
  let depth: number | undefined;
  let layout: CategoryFilterLayout | undefined;
  let hubs = false;

  if ('collect' in obj) {
    throw new Error(
      `${filePath}: :::category-filter collect is removed; use depth to limit collection (e.g. depth: 1 for this folder, depth: 2 for nested folders)`,
    );
  }

  if ('cover' in obj) {
    if (typeof obj.cover !== 'boolean') {
      throw new Error(`${filePath}: :::category-filter cover must be true or false`);
    }
    cover = obj.cover;
  }

  if ('search' in obj) {
    if (typeof obj.search !== 'boolean') {
      throw new Error(`${filePath}: :::category-filter search must be true or false`);
    }
    search = obj.search;
  }

  if ('labels' in obj) {
    if (typeof obj.labels !== 'boolean') {
      throw new Error(`${filePath}: :::category-filter labels must be true or false`);
    }
    labels = obj.labels;
  }

  if ('depth' in obj) {
    const value = obj.depth;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new Error(
        `${filePath}: :::category-filter depth must be an integer >= 1`,
      );
    }
    depth = value;
  }

  if ('hubs' in obj) {
    if (typeof obj.hubs !== 'boolean') {
      throw new Error(`${filePath}: :::category-filter hubs must be true or false`);
    }
    hubs = obj.hubs;
  }

  if ('layout' in obj) {
    const value = obj.layout;
    if (typeof value !== 'string' || !CATEGORY_FILTER_LAYOUTS.has(value as CategoryFilterLayout)) {
      throw new Error(
        `${filePath}: :::category-filter layout must be "tabs", "stack", "flat", or "table"`,
      );
    }
    layout = value as CategoryFilterLayout;
  }

  const pagination = parsePagination(obj.pagination, filePath);

  if (layout === 'table' && !('cover' in obj)) {
    cover = true;
  }

  return {
    cover,
    search,
    labels,
    ...(depth != null ? { depth } : {}),
    ...(layout ? { layout } : {}),
    ...(hubs ? { hubs: true } : {}),
    pagination,
  };
}

function defaultPagination(): CategoryFilterPagination {
  return {
    enable: false,
    size: DEFAULT_CATEGORY_FILTER_PAGE_SIZE,
    style: 'button',
  };
}

function parsePagination(
  raw: unknown,
  filePath: string,
): CategoryFilterPagination {
  const fallback = defaultPagination();
  if (raw == null) return fallback;
  if (typeof raw === 'boolean') {
    return { ...fallback, enable: raw };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(
      `${filePath}: :::category-filter pagination must be true, false, or an object`,
    );
  }
  const obj = raw as Record<string, unknown>;
  let enable = fallback.enable;
  let size = fallback.size;
  let style: CategoryFilterPaginationStyle = fallback.style;

  if ('enable' in obj) {
    if (typeof obj.enable !== 'boolean') {
      throw new Error(
        `${filePath}: :::category-filter pagination.enable must be true or false`,
      );
    }
    enable = obj.enable;
  }
  if ('size' in obj) {
    const value = obj.size;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new Error(
        `${filePath}: :::category-filter pagination.size must be an integer >= 1`,
      );
    }
    size = value;
  }
  if ('style' in obj) {
    const value = obj.style;
    if (value !== 'link' && value !== 'button') {
      throw new Error(
        `${filePath}: :::category-filter pagination.style must be "link" or "button"`,
      );
    }
    style = value;
  }
  return { enable, size, style };
}

/**
 * 相对当前页的采集深度：连接器文件名计 1 层。
 * 例：当前 `RPA_ALIMM`，叶子 `RPA_ALIMM/DMP/conn.md` 的 extra=2。
 */
export function isWithinCategoryFilterDepth(
  pageSlugs: readonly string[],
  prefix: readonly string[],
  depth?: number,
): boolean {
  const extra = pageSlugs.length - prefix.length;
  if (extra < 1) return false;
  if (depth == null) return true;
  return extra <= depth;
}

export function parseCategoryFilterBlockFromRaw(
  raw: string,
  filePath: string,
): ParsedCategoryFilterDirective | null {
  const match = /:::category-filter\r?\n([\s\S]*?)\r?\n:::/.exec(raw);
  if (!match?.[1]) return null;
  try {
    return parseCategoryFilterDirectiveYaml(parseYaml(match[1]), filePath);
  } catch {
    return null;
  }
}

/** 直接读 content/docs 源文件，避免 MDX 编译缓存丢掉 layout 等属性 */
export function readCategoryFilterDirectiveFromDocsPath(
  docsRelativePath: string,
): ParsedCategoryFilterDirective | null {
  const raw = readDocsPathRaw(docsRelativePath);
  if (raw == null) return null;
  return parseCategoryFilterBlockFromRaw(raw, docsRelativePath);
}

export function readPrecedingCategoryFilterHeadingIdFromDocsPath(
  docsRelativePath: string,
): string | undefined {
  const raw = readDocsPathRaw(docsRelativePath);
  if (raw == null) return undefined;
  return parsePrecedingCategoryFilterHeadingId(raw);
}

function readDocsPathRaw(docsRelativePath: string): string | null {
  const rel = docsRelativePath.replace(/^\/+/, '');
  const candidates = path.isAbsolute(docsRelativePath)
    ? [docsRelativePath]
    : [
        path.join(process.cwd(), 'content', 'docs', rel),
        path.join(process.cwd(), rel),
      ];
  for (const abs of candidates) {
    try {
      return readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
  }
  return null;
}
