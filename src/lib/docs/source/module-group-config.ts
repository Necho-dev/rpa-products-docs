import { parse as parseYaml } from 'yaml';
import { normalizeModuleIcon, type ModuleIconConfig } from '@/lib/docs/source/module-icon-config';
export type ModuleGroupConfig = {
  label: string;
  /** lucide 图标：`ShoppingBag` 或 `{ comp, color? }`；无 color 时为 muted 默认样式 */
  icon?: ModuleIconConfig;
};

export function parseModuleGroupYamlValue(
  key: string,
  value: unknown,
  filePath: string,
): ModuleGroupConfig {
  if (typeof value === 'string') {
    const label = value.trim();
    if (!label) {
      throw new Error(
        `${filePath}: :::module-grid group "${key}" must be a non-empty string label`,
      );
    }
    return { label };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const label = typeof obj.label === 'string' ? obj.label.trim() : '';
    if (!label) {
      throw new Error(
        `${filePath}: :::module-grid group "${key}" object must include label`,
      );
    }
    const icon = normalizeModuleIcon(obj.icon);
    return icon ? { label, icon } : { label };
  }

  throw new Error(
    `${filePath}: :::module-grid group "${key}" must be a string or { label, icon? } object`,
  );
}

export function parseModuleGroupsYaml(
  data: unknown,
  filePath: string,
): Record<string, ModuleGroupConfig> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  const groups: Record<string, ModuleGroupConfig> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    groups[key] = parseModuleGroupYamlValue(key, value, filePath);
  }
  return groups;
}

/** 兼容 MDX 编译产物中 `groups: { item: "商品/Item" }` 的简写形式 */
export function normalizeModuleGroupEntry(
  value: ModuleGroupConfig | string | undefined,
): ModuleGroupConfig | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const label = value.trim();
    return label ? { label } : undefined;
  }
  const label = value.label?.trim();
  if (!label) return undefined;
  const icon = normalizeModuleIcon(value.icon);
  return {
    label,
    ...(icon ? { icon } : {}),
  };
}

export function normalizeModuleGroupsInput(
  groups: Record<string, ModuleGroupConfig | string> | undefined,
): Record<string, ModuleGroupConfig> {
  if (!groups) return {};
  const out: Record<string, ModuleGroupConfig> = {};
  for (const [key, value] of Object.entries(groups)) {
    const cfg = normalizeModuleGroupEntry(value);
    if (cfg) out[key] = cfg;
  }
  return out;
}

export type ModuleGridLayout = 'tabs' | 'stack';

const MODULE_GRID_LAYOUTS = new Set<ModuleGridLayout>(['tabs', 'stack']);

/** 解析 :::module-grid YAML，剥离 layout / cover 保留字 */
export function parseModuleGridDirectiveYaml(
  raw: unknown,
  filePath: string,
): {
  layout: ModuleGridLayout;
  cover: boolean;
  groups: Record<string, ModuleGroupConfig>;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { layout: 'tabs', cover: false, groups: {} };
  }

  const obj = { ...(raw as Record<string, unknown>) };
  let layout: ModuleGridLayout = 'tabs';
  let cover = false;

  if ('layout' in obj) {
    const value = obj.layout;
    if (typeof value !== 'string' || !MODULE_GRID_LAYOUTS.has(value as ModuleGridLayout)) {
      throw new Error(
        `${filePath}: :::module-grid layout must be "tabs" or "stack"`,
      );
    }
    layout = value as ModuleGridLayout;
    delete obj.layout;
  }

  if ('cover' in obj) {
    const value = obj.cover;
    if (typeof value !== 'boolean') {
      throw new Error(`${filePath}: :::module-grid cover must be true or false`);
    }
    cover = value;
    delete obj.cover;
  }

  return {
    layout,
    cover,
    groups: parseModuleGroupsYaml(obj, filePath),
  };
}

const MODULE_GRID_BLOCK_RE = /:::module-grid\r?\n([\s\S]*?)\r?\n:::/;

/** 从页面 raw markdown 提取并解析首个 :::module-grid 块（remark 与运行时 TOC 共用）。 */
export function parseModuleGridBlockFromRaw(
  raw: string,
  filePath: string,
): { layout: ModuleGridLayout; groups: Record<string, ModuleGroupConfig> } | null {
  const match = MODULE_GRID_BLOCK_RE.exec(raw);
  if (!match?.[1]) return null;

  let yamlRaw: unknown;
  try {
    yamlRaw = parseYaml(match[1]);
  } catch {
    return null;
  }

  return parseModuleGridDirectiveYaml(yamlRaw, filePath);
}
