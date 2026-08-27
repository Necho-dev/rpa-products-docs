/**
 * 文档引用：frontmatter 只存图（path + kind），:::references 只管展示。
 *
 * 不 import `source` / 任何 RSC-only 模块：`.source` 由 fumadocs-mdx 生成、带 MDX 编译产物，
 * `tsx --test` 加载不了。页面查找一律走注入的 `lookup`，绑定 source 的薄壳在 doc-references.ts。
 *
 * - kind    关系语义（dependency / fallback），只写在 frontmatter，决定默认 badge / 默认 mode
 * - mode    视觉体量（link / summary / preview），只写在 :::references
 * - size    仅 preview：small / medium / large
 * - prompt / badge  展示覆盖，只写在 :::references
 */
import { z } from 'zod';
import { isDocsPathname, stripTrailingSlash } from '@/lib/docs/link-kind';

export const REFERENCE_KINDS = ['dependency', 'fallback'] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export const REFERENCE_MODES = ['link', 'summary', 'preview'] as const;
export type ReferenceMode = (typeof REFERENCE_MODES)[number];

export const REFERENCE_PREVIEW_SIZES = ['small', 'medium', 'large'] as const;
export type ReferencePreviewSize = (typeof REFERENCE_PREVIEW_SIZES)[number];

export const REFERENCE_PROMPT_TYPES = ['info', 'warning', 'success', 'error'] as const;
export type ReferencePromptType = (typeof REFERENCE_PROMPT_TYPES)[number];

/** kind 默认四字徽章；作者可用 :::references badge.label 覆盖 */
export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  dependency: '前置依赖',
  fallback: '备选方案',
};

/** 提示文案上限，避免把卡片撑破 */
export const MAX_REFERENCE_PROMPT_LENGTH = 80;
/** 徽章文案上限（默认四字，允许「授权依赖」一类短标签） */
export const MAX_REFERENCE_BADGE_LABEL_LENGTH = 12;

const HEX_COLOR = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const DEFAULT_MODE_BY_KIND: Record<ReferenceKind, ReferenceMode> = {
  dependency: 'summary',
  fallback: 'summary',
};

export function defaultModeForKind(kind: ReferenceKind): ReferenceMode {
  return DEFAULT_MODE_BY_KIND[kind];
}

export const DEFAULT_PREVIEW_SIZE: ReferencePreviewSize = 'medium';

export const PREVIEW_SIZE_MAX_HEIGHT_CLASS: Record<ReferencePreviewSize, string> = {
  small: 'max-h-64',
  medium: 'max-h-105',
  large: 'max-h-160',
};

const referenceBadgeSchema = z
  .object({
    label: z.string().trim().min(1).max(MAX_REFERENCE_BADGE_LABEL_LENGTH).optional(),
    color: z.string().trim().regex(HEX_COLOR).optional(),
  })
  .strict();

const referencePromptSchema = z
  .object({
    label: z.string().trim().min(1).max(MAX_REFERENCE_PROMPT_LENGTH),
    type: z.enum(REFERENCE_PROMPT_TYPES).optional(),
  })
  .strict();

const docsPathSchema = z.string().refine((p) => isDocsPathname(stripTrailingSlash(p.trim())), {
  message: 'references.path 必须是站内 /docs 路径',
});

/** frontmatter：只声明图边 */
const referenceGraphEdgeSchema = z
  .object({
    kind: z.enum(REFERENCE_KINDS),
    path: docsPathSchema,
  })
  .strict();

export const referencesSchema = z.array(referenceGraphEdgeSchema).optional();

/** :::references YAML：只声明展示；禁止 kind */
export const referenceDirectiveSchema = z
  .object({
    path: docsPathSchema,
    mode: z.enum(REFERENCE_MODES).optional(),
    size: z.enum(REFERENCE_PREVIEW_SIZES).optional(),
    badge: referenceBadgeSchema.optional(),
    prompt: referencePromptSchema.optional(),
  })
  .strict();

export type ReferenceBadge = {
  label: string;
  color?: string;
};

export type ReferencePrompt = {
  label: string;
  type: ReferencePromptType;
};

export type RawReferenceEdge = {
  kind: ReferenceKind;
  path: string;
};

export type ReferencePlacement = {
  path: string;
  mode?: ReferenceMode;
  size?: ReferencePreviewSize;
  badge?: { label?: string; color?: string };
  prompt?: { label: string; type?: ReferencePromptType };
};

export type ResolvedReferenceEdge = {
  kind: ReferenceKind;
  path: string;
  mode: ReferenceMode;
  badge: ReferenceBadge;
  prompt?: ReferencePrompt;
  size?: ReferencePreviewSize;
};

export type NormalizedReferences = {
  edges: RawReferenceEdge[];
};

/** 解析期告警；core 保持纯函数，去重与 dev 判定交给调用方 */
export type ReferenceWarn = (message: string) => void;

function isKind(value: unknown): value is ReferenceKind {
  return typeof value === 'string' && (REFERENCE_KINDS as readonly string[]).includes(value);
}

function isMode(value: unknown): value is ReferenceMode {
  return typeof value === 'string' && (REFERENCE_MODES as readonly string[]).includes(value);
}

function isPreviewSize(value: unknown): value is ReferencePreviewSize {
  return (
    typeof value === 'string' && (REFERENCE_PREVIEW_SIZES as readonly string[]).includes(value)
  );
}

function isPromptType(value: unknown): value is ReferencePromptType {
  return (
    typeof value === 'string' && (REFERENCE_PROMPT_TYPES as readonly string[]).includes(value)
  );
}

function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const color = value.trim();
  return HEX_COLOR.test(color) ? color : undefined;
}

function normalizeBadgeInput(value: unknown): ReferencePlacement['badge'] | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const item = value as Record<string, unknown>;
  const badge: { label?: string; color?: string } = {};
  if (typeof item.label === 'string') {
    const label = item.label.trim();
    if (label) {
      badge.label =
        label.length > MAX_REFERENCE_BADGE_LABEL_LENGTH
          ? label.slice(0, MAX_REFERENCE_BADGE_LABEL_LENGTH)
          : label;
    }
  }
  const color = normalizeHexColor(item.color);
  if (color) badge.color = color;
  if (!badge.label && !badge.color) return undefined;
  return badge;
}

function normalizePromptInput(value: unknown): ReferencePlacement['prompt'] | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.label !== 'string') return undefined;
  const label = item.label.trim();
  if (!label) return undefined;
  const prompt: ReferencePlacement['prompt'] = {
    label:
      label.length > MAX_REFERENCE_PROMPT_LENGTH
        ? label.slice(0, MAX_REFERENCE_PROMPT_LENGTH)
        : label,
  };
  if (isPromptType(item.type)) prompt.type = item.type;
  return prompt;
}

function toRawEdge(value: unknown): RawReferenceEdge | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;

  if (!isKind(item.kind)) return null;
  if (typeof item.path !== 'string') return null;
  const path = stripTrailingSlash(item.path.trim());
  if (!path || !isDocsPathname(path)) return null;

  return { kind: item.kind, path };
}

/**
 * 归一 frontmatter `references`。形状不合法的条目静默丢弃
 * （构建期 zod 已把过关的挡在外面，这里只做运行期兜底）。
 */
export function normalizeReferencesInput(raw: unknown): NormalizedReferences {
  if (!Array.isArray(raw)) return { edges: [] };

  const edges: RawReferenceEdge[] = [];
  for (const item of raw) {
    const edge = toRawEdge(item);
    if (edge) edges.push(edge);
  }
  return { edges };
}

export type ReferenceLookup = (slugs: string[]) => { references?: unknown } | undefined;

export function resolveBadge(
  kind: ReferenceKind,
  badge?: ReferencePlacement['badge'],
): ReferenceBadge {
  const resolved: ReferenceBadge = {
    label: badge?.label?.trim() || REFERENCE_KIND_LABEL[kind],
  };
  if (badge?.color) resolved.color = badge.color;
  return resolved;
}

function finalizeGraphEdge(raw: RawReferenceEdge): ResolvedReferenceEdge {
  return {
    kind: raw.kind,
    path: raw.path,
    mode: defaultModeForKind(raw.kind),
    badge: resolveBadge(raw.kind),
  };
}

/**
 * 同 path 去重：**后出现者覆盖先出现者**。
 * dependency 整体优先，其余保持声明顺序（稳定排序）。
 */
function dedupeAndSort(edges: ResolvedReferenceEdge[]): ResolvedReferenceEdge[] {
  const byPath = new Map<string, ResolvedReferenceEdge>();
  for (const edge of edges) {
    byPath.delete(edge.path);
    byPath.set(edge.path, edge);
  }

  return [...byPath.values()]
    .map((edge, index) => ({ edge, index }))
    .sort((a, b) => {
      const aFirst = a.edge.kind === 'dependency' ? 0 : 1;
      const bFirst = b.edge.kind === 'dependency' ? 0 : 1;
      if (aFirst !== bFirst) return aFirst - bFirst;
      return a.index - b.index;
    })
    .map(({ edge }) => edge);
}

/**
 * 解析某页 frontmatter 图边（无 inherit）。
 * `lookup` 注入页面数据，便于在 node:test 里喂假数据。
 */
export function resolveReferencesWith(
  slugs: string[],
  lookup: ReferenceLookup,
  warn?: ReferenceWarn,
): ResolvedReferenceEdge[] {
  void warn;
  const data = lookup(slugs);
  if (!data) return [];
  const { edges } = normalizeReferencesInput(data.references);
  if (edges.length === 0) return [];
  return dedupeAndSort(edges.map((edge) => finalizeGraphEdge(edge)));
}

export function findGraphEdge(
  edges: RawReferenceEdge[],
  path: string,
): RawReferenceEdge | undefined {
  const target = stripTrailingSlash(path.trim());
  return edges.find((edge) => edge.path === target);
}

/**
 * 把 :::references 展示字段叠到 frontmatter 图边上。
 * path 未声明则返回 null（调用方不渲染）。
 */
export function resolvePlacedReference(
  graph: RawReferenceEdge[],
  placement: ReferencePlacement,
  warn?: ReferenceWarn,
): ResolvedReferenceEdge | null {
  const path = stripTrailingSlash(placement.path.trim());
  const edge = findGraphEdge(graph, path);
  if (!edge) {
    warn?.(`:::references path ${path} 未在 frontmatter references 中声明，已忽略`);
    return null;
  }

  const mode = placement.mode ?? defaultModeForKind(edge.kind);
  const resolved: ResolvedReferenceEdge = {
    kind: edge.kind,
    path: edge.path,
    mode,
    badge: resolveBadge(edge.kind, placement.badge),
  };

  if (placement.prompt) {
    resolved.prompt = {
      label: placement.prompt.label,
      type: placement.prompt.type ?? 'info',
    };
  }

  if (placement.size) {
    if (mode === 'preview') {
      resolved.size = placement.size;
    } else {
      warn?.(`:::references size 仅在 mode: preview 时生效，已忽略（path ${path}）`);
    }
  } else if (mode === 'preview') {
    resolved.size = DEFAULT_PREVIEW_SIZE;
  }

  return resolved;
}

export function normalizeReferencePlacement(raw: unknown): ReferencePlacement | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.path !== 'string') return null;
  const path = stripTrailingSlash(item.path.trim());
  if (!path || !isDocsPathname(path)) return null;

  const placement: ReferencePlacement = { path };
  if (isMode(item.mode)) placement.mode = item.mode;
  if (isPreviewSize(item.size)) placement.size = item.size;
  const badge = normalizeBadgeInput(item.badge);
  if (badge) placement.badge = badge;
  const prompt = normalizePromptInput(item.prompt);
  if (prompt) placement.prompt = prompt;
  return placement;
}

export type Referrer = {
  url: string;
  title: string;
  icon?: string;
  /** 服务端预格式化的「MM-DD HH:mm」 */
  updatedLabel?: string;
};

export type BacklinkEntry = Referrer & {
  explicitPaths: string[];
};

/**
 * 反查索引：目标 path → 引用它的页面列表（按标题排序）。
 * 只吃 frontmatter 显式边。
 */
export function buildBacklinks(entries: BacklinkEntry[]): Map<string, Referrer[]> {
  const map = new Map<string, Referrer[]>();

  for (const entry of entries) {
    const seen = new Set<string>();
    for (const rawPath of entry.explicitPaths) {
      const path = stripTrailingSlash(rawPath.trim());
      if (!path || seen.has(path) || path === stripTrailingSlash(entry.url)) continue;
      seen.add(path);

      const referrer: Referrer = { url: entry.url, title: entry.title };
      if (entry.icon) referrer.icon = entry.icon;
      const list = map.get(path);
      if (list) list.push(referrer);
      else map.set(path, [referrer]);
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  }
  return map;
}
