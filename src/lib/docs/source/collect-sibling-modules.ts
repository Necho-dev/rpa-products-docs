import {
  hasScheduleMeta,
  type DataReadyMeta,
  type EstimatedDurationMeta,
  type MinIntervalMeta,
  type ScheduleMetaFields,
} from '@/lib/docs/format-schedule-meta';
import {
  type ModuleGroupConfig,
  normalizeModuleGroupEntry,
} from './module-group-config';
import {
  normalizeModuleIcon,
  type ModuleIconConfig,
} from './module-icon-config';

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
  coverUrl?: string;
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
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
  /** 站内平台 favicon（/resources/images/public/_shared/...） */
  faviconUrl?: string;
  coverUrl?: string;
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
};

export type ModuleGroupData = {
  key: string;
  label: string;
  icon?: ModuleIconConfig;
  modules: ModuleCardData[];
};

/**
 * 将 slug / entry 拆成可匹配的关键词段（不依赖任何业务命名约定）。
 * - slug：按 `-` 分段，如 `rpa-conn-alimm-ppxx-foo` → `ppxx`
 * - entry：按 `.` 分段，如 `rpa.conn.alimm.ppxx.foo` → `ppxx`
 */
export function tokenizeModuleIdentifier(
  slug: string,
  entry?: string,
): string[] {
  const tokens = new Set<string>();
  for (const part of slug.split('-')) {
    const t = part.trim().toLowerCase();
    if (t) tokens.add(t);
  }
  if (entry?.trim()) {
    for (const part of entry.split('.')) {
      const t = part.trim().toLowerCase();
      if (t) tokens.add(t);
    }
  }
  return [...tokens];
}

/**
 * 用 module-grid YAML 的分组 key 对 slug/entry 做整段关键词匹配。
 * 按 `groupKeys` 声明顺序取第一个命中项；均未命中则返回 undefined。
 */
export function inferGroupKeyByKeyword(
  slug: string,
  entry: string | undefined,
  groupKeys: readonly string[],
): string | undefined {
  if (groupKeys.length === 0) return undefined;
  const tokens = new Set(tokenizeModuleIdentifier(slug, entry));
  for (const key of groupKeys) {
    const needle = key.trim().toLowerCase();
    if (needle && tokens.has(needle)) return key;
  }
  return undefined;
}

export function capitalizeGroupKey(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function slugBasename(slugs: string[]): string {
  return slugs[slugs.length - 1] ?? '';
}

/** 将 raw group key 解析为 Tab bucket（YAML 配置 / 显式分组 / Other） */
export function resolveGroupBucket(
  rawKey: string,
  groupsYaml: Record<string, ModuleGroupConfig | string>,
  groupExplicit: boolean,
): { key: string; label: string; icon?: ModuleIconConfig } {
  const yamlCfg = normalizeModuleGroupEntry(groupsYaml[rawKey]);

  if (yamlCfg) {
    return { key: rawKey, label: yamlCfg.label, icon: yamlCfg.icon };
  }

  if (groupExplicit) {
    return { key: rawKey, label: capitalizeGroupKey(rawKey) };
  }

  return { key: OTHER_GROUP_KEY, label: OTHER_GROUP_LABEL };
}

/**
 * 从父 index 的 module-grid YAML 解析子文档所属分组（cover OG fallback / tag 过滤共用）。
 */
export function resolveModuleGroupYamlContext(input: {
  slug: string;
  entry?: string;
  moduleGroup?: string;
  groupsYaml: Record<string, ModuleGroupConfig | string>;
}): { groupKey?: string; label?: string; icon?: ModuleIconConfig } {
  const groupKey =
    input.moduleGroup?.trim() ||
    inferGroupKeyByKeyword(
      input.slug,
      input.entry,
      Object.keys(input.groupsYaml),
    );

  if (!groupKey) return {};

  const yamlCfg = normalizeModuleGroupEntry(input.groupsYaml[groupKey]);
  const icon = normalizeModuleIcon(yamlCfg?.icon);

  return {
    groupKey,
    label: yamlCfg?.label,
    icon: icon ?? { comp: 'Package' },
  };
}

/**
 * 将 sibling 模块分配到 Tab 分组并排序。
 * 分组优先级：显式 moduleGroup → YAML key 关键词匹配（slug/entry）→ 其他。
 */
export function collectSiblingModuleGroups(
  modules: SiblingModuleInput[],
  groupsYaml: Record<string, ModuleGroupConfig | string>,
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
      inferGroupKeyByKeyword(mod.slug, mod.entry, yamlOrder) ||
      OTHER_GROUP_KEY;

    const { key: bucketKey, label: bucketLabel, icon: bucketIcon } =
      resolveGroupBucket(rawKey, groupsYaml, mod.groupExplicit);

    const bucket = ensureBucket(bucketKey, bucketLabel, bucketIcon);
    const scheduleFields: ScheduleMetaFields = {
      entry: mod.entry,
      dataReady: mod.dataReady,
      estimatedDuration: mod.estimatedDuration,
      minInterval: mod.minInterval,
    };
    bucket.modules.push({
      title: mod.moduleTitle?.trim() || mod.title,
      description: mod.description?.trim() || undefined,
      badge: mod.badge,
      href: `./${mod.slug}`,
      code: mod.entry.trim(),
      ...(mod.moduleIcon ? { icon: mod.moduleIcon } : {}),
      ...(mod.moduleUrl?.trim() ? { url: mod.moduleUrl.trim() } : {}),
      ...(mod.coverUrl ? { coverUrl: mod.coverUrl } : {}),
      ...(hasScheduleMeta(scheduleFields)
        ? {
            dataReady: mod.dataReady,
            estimatedDuration: mod.estimatedDuration,
            minInterval: mod.minInterval,
          }
        : {}),
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
