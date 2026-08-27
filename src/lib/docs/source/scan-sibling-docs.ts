import { readdirSync, readFileSync, type Dirent } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  readLeafCategoryKey,
  readMetaCategoryAxis,
} from '@/lib/docs/source/category-config';
import {
  compareBySlugOrder,
  parseMetaPagesOrder,
  readDocsMetaJson,
} from '@/lib/docs/source/meta-pages-order';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export type ScannedSiblingDoc = {
  slug: string;
  title: string;
  entry?: string;
  /** 页面 `category` 归属 key */
  group?: string;
};

const META_PANEL_BLOCK_RE = /:::meta-panel\r?\n([\s\S]*?)\r?\n:::/;

function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m?.[1]) return {};
  try {
    const data = parseYaml(m[1]);
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readSiblingDocFromMarkdownFile(
  slug: string,
  filePath: string,
): ScannedSiblingDoc | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const fm = parseFrontmatter(raw);
  const title = typeof fm.title === 'string' ? fm.title : slug;
  const entry = typeof fm.entry === 'string' ? fm.entry : undefined;
  const group = readLeafCategoryKey(fm.category);

  return {
    slug,
    title,
    entry,
    group,
  };
}

export function scanSiblingMarkdownModulesSync(
  indexFilePath: string,
): ScannedSiblingDoc[] {
  const dir = path.dirname(indexFilePath);
  const pagesOrder = readMetaPagesOrderFromDir(dir);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }

  const modules: ScannedSiblingDoc[] = [];

  for (const name of names) {
    if (!name.endsWith('.md')) continue;
    if (name === 'index.md' || name === 'index.mdx') continue;

    const slug = name.replace(/\.mdx?$/, '');
    const filePath = path.join(dir, name);
    const scanned = readSiblingDocFromMarkdownFile(slug, filePath);
    if (scanned) modules.push(scanned);
  }

  modules.sort((a, b) => compareBySlugOrder(a.slug, b.slug, pagesOrder));
  return modules;
}

/** 目录页：扫描子目录下的 index.md(x) */
export function scanCatalogPackageIndexModulesSync(
  indexFilePath: string,
): ScannedSiblingDoc[] {
  const dir = path.dirname(indexFilePath);
  const pagesOrder = readMetaPagesOrderFromDir(dir);
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const modules: ScannedSiblingDoc[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const indexMd = path.join(dir, slug, 'index.md');
    const indexMdx = path.join(dir, slug, 'index.mdx');

    const scanned =
      readSiblingDocFromMarkdownFile(slug, indexMd) ??
      readSiblingDocFromMarkdownFile(slug, indexMdx);
    if (scanned) modules.push(scanned);
  }

  modules.sort((a, b) => compareBySlugOrder(a.slug, b.slug, pagesOrder));
  return modules;
}

/**
 * tabs 布局写入 TOC 的分组：优先 meta.json categoryAxis.items（同目录叶子词表），
 * 没有词表时回退到子目录名（与 folderPath 第一轴 slug 一致，如阿里妈妈 DMP/PXB）。
 */
export function resolveCategoryFilterTabGroups(
  indexFilePath: string,
  pageSlug: string[],
): { key: string; label: string }[] {
  const catalog =
    readMetaCategoryAxis(readDocsMetaJson(pageSlug.join('/'))).items ?? [];
  if (catalog.length > 0) {
    const modules = scanSiblingMarkdownModulesSync(indexFilePath);
    const used = new Set(
      modules.map((m) => m.group).filter((g): g is string => Boolean(g)),
    );
    const rows =
      used.size > 0 ? catalog.filter((row) => used.has(row.key)) : catalog;
    return rows.map((row) => ({ key: row.key, label: row.item }));
  }

  const packages = scanCatalogPackageIndexModulesSync(indexFilePath);
  const seen = new Set<string>();
  const rows: { key: string; label: string }[] = [];
  for (const pkg of packages) {
    const key = pkg.slug;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, label: pkg.title });
  }
  return rows;
}

export type MetaPanelFields = {
  platformUrl?: string;
  icon?: string;
};

function parseMetaPanelBlock(content: string): MetaPanelFields {
  const match = META_PANEL_BLOCK_RE.exec(content);
  if (!match?.[1]) return {};

  try {
    const data = parseYaml(match[1]);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const record = data as Record<string, unknown>;
    const platformUrl =
      typeof record.platformUrl === 'string' && record.platformUrl.trim()
        ? record.platformUrl.trim()
        : undefined;
    const icon =
      typeof record.icon === 'string' && record.icon.trim()
        ? record.icon.trim()
        : undefined;
    return { platformUrl, icon };
  } catch {
    return {};
  }
}

export function parseMetaPanelPlatformUrl(content: string): string | undefined {
  return parseMetaPanelBlock(content).platformUrl;
}

function readMetaPagesOrderFromDir(dir: string): string[] {
  try {
    const raw = readFileSync(path.join(dir, 'meta.json'), 'utf8');
    const data = JSON.parse(raw) as { pages?: unknown };
    return parseMetaPagesOrder(data.pages);
  } catch {
    return [];
  }
}

/**
 * 从文档路径推导 fumadocs pageSlug。
 * - `content/docs/rpa/index.mdx` → `['rpa']`
 * - `content/docs/rpa/RPA_QIANNIU/index.md` → `['rpa', 'RPA_QIANNIU']`
 */
export function pageSlugFromDocFile(filePath: string): string[] | null {
  const normalized = filePath.replace(/\\/g, '/');
  const marker = '/content/docs/';
  const idx = normalized.indexOf(marker);
  if (idx === -1) return null;

  const rel = normalized.slice(idx + marker.length);
  const parts = rel.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  parts.pop();
  return parts;
}

/**
 * 含叶子页文件名：`.../rpa-conn-foo.md` → `[..., 'rpa-conn-foo']`；index 仍落到目录 slug。
 */
export function pageSlugFromDocPageFile(filePath: string): string[] | null {
  const normalized = filePath.replace(/\\/g, '/');
  const marker = '/content/docs/';
  const idx = normalized.indexOf(marker);
  if (idx === -1) return null;

  const rel = normalized.slice(idx + marker.length);
  const parts = rel.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const file = parts.pop();
  if (!file) return null;
  const stem = file.replace(/\.mdx?$/, '');
  if (stem === 'index') return parts;
  return [...parts, stem];
}

/** 从 processed markdown 中移除仅供网页 TOC 使用的虚拟分组标题。 */
export function stripTocOnlyHeadings(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+.+(?:\\?\[toc\]).*$\n?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}
