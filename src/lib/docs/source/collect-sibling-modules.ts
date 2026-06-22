import {
  type ModuleGroupConfig,
  normalizeModuleGroupEntry,
} from './module-group-config';
import type { ModuleIconConfig } from './module-icon-config';

export const OTHER_GROUP_KEY = '__other__';
export const OTHER_GROUP_LABEL = '其他/Other';

export type DocBadge = {
  label: string;
  color?: string;
};

export type SiblingModuleInput = {
  slug: string;
  title: string;
  description?: string;
  entry?: string;
  moduleTitle?: string;
  moduleGroup?: string;
  moduleIcon?: ModuleIconConfig;
  moduleUrl?: string;
  badge?: DocBadge;
  groupExplicit: boolean;
};

export type ModuleCardData = {
  title: string;
  description?: string;
  badge?: DocBadge;
  href: string;
  code: string;
  icon?: ModuleIconConfig;
  url?: string;
};

export type ModuleGroupData = {
  key: string;
  label: string;
  icon?: ModuleIconConfig;
  modules: ModuleCardData[];
};

export function packageEntryToFilenamePrefix(entry: string): string {
  if (entry.endsWith('-all')) {
    return `${entry.slice(0, -4)}-`;
  }
  return `${entry}-`;
}

export function inferGroupKeyFromFilename(
  filename: string,
  packageEntry: string,
): string | undefined {
  const prefix = packageEntryToFilenamePrefix(packageEntry);
  if (!filename.startsWith(prefix)) return undefined;
  const rest = filename.slice(prefix.length);
  const segment = rest.split('-')[0];
  return segment || undefined;
}

export function capitalizeGroupKey(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * 将 sibling 模块分配到 Tab 分组并排序。
 */
export function collectSiblingModuleGroups(
  modules: SiblingModuleInput[],
  groupsYaml: Record<string, ModuleGroupConfig | string>,
  packageEntry: string,
): ModuleGroupData[] {
  const yamlOrder = Object.keys(groupsYaml);
  const bucketMap = new Map<string, ModuleGroupData>();

  function ensureBucket(
    key: string,
    label: string,
    icon?: ModuleIconConfig,
  ): ModuleGroupData {
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = { key, label, icon, modules: [] };
      bucketMap.set(key, bucket);
    } else if (!bucket.label && label) {
      bucket.label = label;
    }
    if (icon && !bucket.icon) {
      bucket.icon = icon;
    }
    return bucket;
  }

  for (const mod of modules) {
    if (!mod.entry?.trim()) continue;

    const rawKey =
      mod.moduleGroup?.trim() ||
      inferGroupKeyFromFilename(mod.slug, packageEntry) ||
      OTHER_GROUP_KEY;

    let bucketKey: string;
    let bucketLabel: string;
    let bucketIcon: ModuleIconConfig | undefined;

    const yamlCfg = normalizeModuleGroupEntry(groupsYaml[rawKey]);

    if (yamlCfg) {
      bucketKey = rawKey;
      bucketLabel = yamlCfg.label;
      bucketIcon = yamlCfg.icon;
    } else if (mod.groupExplicit && mod.moduleGroup?.trim()) {
      bucketKey = rawKey;
      bucketLabel = capitalizeGroupKey(rawKey);
    } else {
      bucketKey = OTHER_GROUP_KEY;
      bucketLabel = OTHER_GROUP_LABEL;
    }

    const bucket = ensureBucket(bucketKey, bucketLabel, bucketIcon);
    bucket.modules.push({
      title: mod.moduleTitle?.trim() || mod.title,
      description: mod.description?.trim() || undefined,
      badge: mod.badge,
      href: `./${mod.slug}`,
      code: mod.entry.trim(),
      ...(mod.moduleIcon ? { icon: mod.moduleIcon } : {}),
      ...(mod.moduleUrl?.trim() ? { url: mod.moduleUrl.trim() } : {}),
    });
  }

  for (const bucket of bucketMap.values()) {
    bucket.modules.sort((a, b) => a.href.localeCompare(b.href));
  }

  const orderedKeys: string[] = [];

  for (const key of yamlOrder) {
    if (bucketMap.has(key)) orderedKeys.push(key);
  }

  const extraExplicit = [...bucketMap.keys()]
    .filter((k) => k !== OTHER_GROUP_KEY && !yamlOrder.includes(k))
    .sort((a, b) => a.localeCompare(b));

  orderedKeys.push(...extraExplicit);

  if (bucketMap.has(OTHER_GROUP_KEY)) {
    orderedKeys.push(OTHER_GROUP_KEY);
  }

  return orderedKeys.map((k) => bucketMap.get(k)!);
}
