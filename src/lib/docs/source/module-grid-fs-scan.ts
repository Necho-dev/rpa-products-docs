import { readdirSync, readFileSync, type Dirent } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  collectSiblingModuleGroups,
  type ModuleGroupData,
  type SiblingModuleInput,
} from '@/lib/docs/source/collect-sibling-modules';
import type { ModuleGroupConfig, ModuleGridLayout } from '@/lib/docs/source/module-group-config';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export type ScannedSiblingModule = {
  slug: string;
  title: string;
  entry?: string;
  moduleGroup?: string;
  /** frontmatter `badge`；任意 label，不做业务枚举限制 */
  badge?: { label: string; color?: string };
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

function readSiblingModuleFromMarkdownFile(
  slug: string,
  filePath: string,
): ScannedSiblingModule | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const fm = parseFrontmatter(raw);
  const title = typeof fm.title === 'string' ? fm.title : slug;
  const entry = typeof fm.entry === 'string' ? fm.entry : undefined;
  const moduleGroup =
    typeof fm.moduleGroup === 'string' ? fm.moduleGroup : undefined;

  let badge: ScannedSiblingModule['badge'];
  const rawBadge = fm.badge;
  if (rawBadge && typeof rawBadge === 'object' && !Array.isArray(rawBadge)) {
    const b = rawBadge as { label?: unknown; color?: unknown };
    if (typeof b.label === 'string' && b.label.trim()) {
      badge = {
        label: b.label.trim(),
        color:
          typeof b.color === 'string' && b.color.trim()
            ? b.color.trim()
            : undefined,
      };
    }
  }

  return {
    slug,
    title,
    entry,
    moduleGroup,
    badge,
  };
}

export function scanSiblingMarkdownModulesSync(
  indexFilePath: string,
): ScannedSiblingModule[] {
  const dir = path.dirname(indexFilePath);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }

  const modules: ScannedSiblingModule[] = [];

  for (const name of names.sort()) {
    if (!name.endsWith('.md')) continue;
    if (name === 'index.md' || name === 'index.mdx') continue;

    const slug = name.replace(/\.mdx?$/, '');
    const filePath = path.join(dir, name);
    const module = readSiblingModuleFromMarkdownFile(slug, filePath);
    if (module) modules.push(module);
  }

  return modules;
}

/** 目录页（如 connectors/index）：扫描子目录下的 index.md(x) 作为模块卡片来源 */
export function scanCatalogPackageIndexModulesSync(
  indexFilePath: string,
): ScannedSiblingModule[] {
  const dir = path.dirname(indexFilePath);
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const modules: ScannedSiblingModule[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const indexMd = path.join(dir, slug, 'index.md');
    const indexMdx = path.join(dir, slug, 'index.mdx');

    const module =
      readSiblingModuleFromMarkdownFile(slug, indexMd) ??
      readSiblingModuleFromMarkdownFile(slug, indexMdx);
    if (module) modules.push(module);
  }

  return modules;
}

export function scanModuleGridModulesSync(
  indexFilePath: string,
): ScannedSiblingModule[] {
  const flat = scanSiblingMarkdownModulesSync(indexFilePath);
  if (flat.length > 0) return flat;
  return scanCatalogPackageIndexModulesSync(indexFilePath);
}

function scannedModulesToSiblingInputs(
  modules: ScannedSiblingModule[],
): SiblingModuleInput[] {
  return modules
    .filter((m) => m.entry?.trim())
    .map((m) => ({
      slug: m.slug,
      title: m.title,
      entry: m.entry,
      moduleGroup: m.moduleGroup,
      groupExplicit: Boolean(m.moduleGroup?.trim()),
    }));
}

/** 从 :::meta-panel 块解析 platformUrl，供 moduleUrl 回退 */
export function parseMetaPanelPlatformUrl(content: string): string | undefined {
  const match = META_PANEL_BLOCK_RE.exec(content);
  if (!match?.[1]) return undefined;

  try {
    const data = parseYaml(match[1]);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const url = (data as Record<string, unknown>).platformUrl;
    return typeof url === 'string' && url.trim() ? url.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function collectModuleGridGroupsFromScan(
  modules: ScannedSiblingModule[],
  groupsYaml: Record<string, ModuleGroupConfig | string>,
): ModuleGroupData[] {
  const inputs = scannedModulesToSiblingInputs(modules);
  return collectSiblingModuleGroups(inputs, groupsYaml);
}

export function readPackageEntryFromFileContent(content: string): string | undefined {
  const fm = parseFrontmatter(content);
  return typeof fm.entry === 'string' ? fm.entry : undefined;
}

export function pageSlugFromDocFile(filePath: string): string[] {
  const normalized = filePath.replace(/\\/g, '/');
  const marker = '/content/docs/';
  const idx = normalized.indexOf(marker);
  if (idx === -1) return [];

  const rel = normalized.slice(idx + marker.length);
  const parts = rel.split('/');
  parts.pop();
  return parts;
}

function serializeGroupIconForExport(
  icon: ModuleIconConfig,
): string | ModuleIconConfig {
  return icon.color ? icon : icon.comp;
}

/** LLM / processed 导出：将扫描到的模块清单嵌合进 :::module-grid YAML 各分组下。 */
export function formatModuleGridDirectiveWithModules(
  groupsYaml: Record<string, ModuleGroupConfig>,
  nonEmptyGroups: ModuleGroupData[],
  layout: ModuleGridLayout = 'tabs',
  cover = false,
): string {
  if (nonEmptyGroups.length === 0) return '';

  const payload: Record<string, unknown> = {};
  if (layout === 'stack') {
    payload.layout = 'stack';
  }
  if (cover) {
    payload.cover = true;
  }

  for (const group of nonEmptyGroups) {
    const cfg = groupsYaml[group.key];
    const icon = cfg?.icon ?? group.icon;
    payload[group.key] = {
      label: cfg?.label ?? group.label,
      ...(icon ? { icon: serializeGroupIconForExport(icon) } : {}),
      modules: group.modules.map((m) => ({
        title: m.title,
        slug: m.href.replace(/^\.\//, ''),
        entry: m.code,
      })),
    };
  }

  const yamlBody = stringifyYaml(payload, { lineWidth: 0 }).trimEnd();
  return `:::module-grid\n${yamlBody}\n:::\n`;
}

/** 从 processed markdown 中移除仅供网页 TOC 使用的虚拟分组标题。 */
export function stripTocOnlyHeadings(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+.+(?:\\?\[toc\]).*$\n?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}
