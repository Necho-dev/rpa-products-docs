import {
  normalizeModuleIcon,
  type ModuleIconConfig,
} from '@/lib/docs/source/module-icon-config';

/**
 * ModuleGrid 专用 frontmatter（`module:`）。
 * 与页面级 `title` / `icon`（侧栏）分离。
 */
export type ModuleFrontmatter = {
  /** 卡片标题；未写则用文档 title */
  title?: string;
  /** 卡片外链（平台主页等） */
  link?: string;
  /** 对应父页 :::module-grid YAML 的 group key */
  group?: string;
  /** 卡片图标；未写时可回退页面级 `icon` */
  icon?: ModuleIconConfig;
  /** 覆盖 grid `cover`：单卡强制开/关 */
  cover?: boolean;
};

type LegacyModuleFields = {
  moduleTitle?: unknown;
  moduleUrl?: unknown;
  moduleGroup?: unknown;
  moduleIcon?: unknown;
  moduleCover?: unknown;
};

function readNestedModule(value: unknown): ModuleFrontmatter {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : undefined;
  const link =
    typeof obj.link === 'string' && obj.link.trim()
      ? obj.link.trim()
      : undefined;
  const group =
    typeof obj.group === 'string' && obj.group.trim()
      ? obj.group.trim()
      : undefined;
  const icon = normalizeModuleIcon(obj.icon);
  const cover = typeof obj.cover === 'boolean' ? obj.cover : undefined;
  return {
    ...(title ? { title } : {}),
    ...(link ? { link } : {}),
    ...(group ? { group } : {}),
    ...(icon ? { icon } : {}),
    ...(cover !== undefined ? { cover } : {}),
  };
}

function readLegacyModule(data: LegacyModuleFields): ModuleFrontmatter {
  const title =
    typeof data.moduleTitle === 'string' && data.moduleTitle.trim()
      ? data.moduleTitle.trim()
      : undefined;
  const link =
    typeof data.moduleUrl === 'string' && data.moduleUrl.trim()
      ? data.moduleUrl.trim()
      : undefined;
  const group =
    typeof data.moduleGroup === 'string' && data.moduleGroup.trim()
      ? data.moduleGroup.trim()
      : undefined;
  const icon = normalizeModuleIcon(data.moduleIcon);
  const cover =
    typeof data.moduleCover === 'boolean' ? data.moduleCover : undefined;
  return {
    ...(title ? { title } : {}),
    ...(link ? { link } : {}),
    ...(group ? { group } : {}),
    ...(icon ? { icon } : {}),
    ...(cover !== undefined ? { cover } : {}),
  };
}

/**
 * 读取 ModuleGrid 配置：优先 `module:`，兼容旧扁平字段。
 * 同名字段以嵌套 `module.*` 为准。
 */
export function readModuleFrontmatter(
  data: Record<string, unknown> | LegacyModuleFields & { module?: unknown },
): ModuleFrontmatter {
  const nested = readNestedModule(
    (data as { module?: unknown }).module,
  );
  const legacy = readLegacyModule(data as LegacyModuleFields);
  return {
    title: nested.title ?? legacy.title,
    link: nested.link ?? legacy.link,
    group: nested.group ?? legacy.group,
    icon: nested.icon ?? legacy.icon,
    cover: nested.cover ?? legacy.cover,
  };
}
