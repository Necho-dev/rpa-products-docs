/**
 * 文档引用关系（frontmatter `references`）的纯解析层。
 *
 * 不 import `source` / 任何 RSC-only 模块：`.source` 由 fumadocs-mdx 生成、带 MDX 编译产物，
 * `tsx --test` 加载不了。页面查找一律走注入的 `lookup`，绑定 source 的薄壳在 doc-references.ts。
 *
 * 三根正交轴：
 * - kind    关系语义（dependency / fallback），决定默认 mode、默认 badge、排序
 * - mode    视觉体量（link / summary / preview）
 * - prompt  可选提示（label + type），各 mode 各自展示（卡片内文案 / 悬浮提示）
 * - badge   可选覆盖默认四字标签与颜色
 */
import { z } from 'zod';
import { isDocsPathname, stripTrailingSlash } from '@/lib/docs/link-kind';

export const REFERENCE_KINDS = ['dependency', 'fallback'] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export const REFERENCE_MODES = ['link', 'summary', 'preview'] as const;
export type ReferenceMode = (typeof REFERENCE_MODES)[number];

export const REFERENCE_PROMPT_TYPES = ['info', 'warning', 'success', 'error'] as const;
export type ReferencePromptType = (typeof REFERENCE_PROMPT_TYPES)[number];

/** kind 默认四字徽章；作者可用 badge.label 覆盖 */
export const REFERENCE_KIND_LABEL: Record<ReferenceKind, string> = {
  dependency: '前置依赖',
  fallback: '备选方案',
};

/** inherit 最多向上两级：连接器 → 平台 index → 分区 index */
export const MAX_INHERIT_DEPTH = 2;
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

const referenceEdgeSchema = z
  .object({
    kind: z.enum(REFERENCE_KINDS),
    path: z.string().refine((p) => isDocsPathname(stripTrailingSlash(p.trim())), {
      message: 'references.path 必须是站内 /docs 路径',
    }),
    mode: z.enum(REFERENCE_MODES).optional(),
    badge: referenceBadgeSchema.optional(),
    prompt: referencePromptSchema.optional(),
  })
  .strict();

const referenceInheritSchema = z.object({ inherit: z.literal(true) });

export const referencesSchema = z
  .union([
    z.literal('inherit'),
    z.array(z.union([referenceInheritSchema, referenceEdgeSchema])),
  ])
  .optional();

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
  mode?: ReferenceMode;
  badge?: { label?: string; color?: string };
  prompt?: { label: string; type?: ReferencePromptType };
};

export type ResolvedReferenceEdge = {
  kind: ReferenceKind;
  path: string;
  mode: ReferenceMode;
  badge: ReferenceBadge;
  prompt?: ReferencePrompt;
};

export type NormalizedReferences = {
  inherit: boolean;
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

function normalizeBadgeInput(value: unknown): RawReferenceEdge['badge'] | undefined {
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

function normalizePromptInput(value: unknown): RawReferenceEdge['prompt'] | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.label !== 'string') return undefined;
  const label = item.label.trim();
  if (!label) return undefined;
  const prompt: RawReferenceEdge['prompt'] = {
    label:
      label.length > MAX_REFERENCE_PROMPT_LENGTH
        ? label.slice(0, MAX_REFERENCE_PROMPT_LENGTH)
        : label,
  };
  if (isPromptType(item.type)) prompt.type = item.type;
  return prompt;
}

function isInheritItem(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { inherit?: unknown }).inherit === true
  );
}

function toRawEdge(value: unknown): RawReferenceEdge | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;

  if (!isKind(item.kind)) return null;
  if (typeof item.path !== 'string') return null;
  const path = stripTrailingSlash(item.path.trim());
  if (!path || !isDocsPathname(path)) return null;

  const edge: RawReferenceEdge = { kind: item.kind, path };
  if (isMode(item.mode)) edge.mode = item.mode;
  const badge = normalizeBadgeInput(item.badge);
  if (badge) edge.badge = badge;
  const prompt = normalizePromptInput(item.prompt);
  if (prompt) edge.prompt = prompt;
  return edge;
}

/**
 * 归一 `references` 的两种 inherit 写法：整表 `references: inherit`、列表内 `{ inherit: true }`。
 * 形状不合法的条目静默丢弃（构建期 zod 已把过关的挡在外面，这里只做运行期兜底）。
 */
export function normalizeReferencesInput(raw: unknown): NormalizedReferences {
  if (raw === 'inherit') return { inherit: true, edges: [] };
  if (!Array.isArray(raw)) return { inherit: false, edges: [] };

  let inherit = false;
  const edges: RawReferenceEdge[] = [];
  for (const item of raw) {
    if (isInheritItem(item)) {
      inherit = true;
      continue;
    }
    const edge = toRawEdge(item);
    if (edge) edges.push(edge);
  }
  return { inherit, edges };
}

/** `['rpa','RPA_ALIMM','conn']` → `['rpa','RPA_ALIMM']`；站点根返回 null */
export function parentIndexSlugs(slugs: string[]): string[] | null {
  if (!Array.isArray(slugs) || slugs.length === 0) return null;
  return slugs.slice(0, -1);
}

export type ReferenceLookup = (slugs: string[]) => { references?: unknown } | undefined;

function collectRawEdges(
  slugs: string[],
  lookup: ReferenceLookup,
  depth: number,
  visited: Set<string>,
): RawReferenceEdge[] {
  const key = slugs.join('/');
  if (visited.has(key)) return [];
  visited.add(key);

  const data = lookup(slugs);
  if (!data) return [];

  const { inherit, edges } = normalizeReferencesInput(data.references);
  if (!inherit || depth >= MAX_INHERIT_DEPTH) return edges;

  const parent = parentIndexSlugs(slugs);
  if (!parent) return edges;

  // 继承边排在本页显式边之前；同 path 由后面的显式边覆盖
  return [...collectRawEdges(parent, lookup, depth + 1, visited), ...edges];
}

export function resolveBadge(
  kind: ReferenceKind,
  badge?: RawReferenceEdge['badge'],
): ReferenceBadge {
  const resolved: ReferenceBadge = {
    label: badge?.label?.trim() || REFERENCE_KIND_LABEL[kind],
  };
  if (badge?.color) resolved.color = badge.color;
  return resolved;
}

function finalizeEdge(raw: RawReferenceEdge): ResolvedReferenceEdge {
  const edge: ResolvedReferenceEdge = {
    kind: raw.kind,
    path: raw.path,
    mode: raw.mode ?? defaultModeForKind(raw.kind),
    badge: resolveBadge(raw.kind, raw.badge),
  };
  if (raw.prompt) {
    edge.prompt = {
      label: raw.prompt.label,
      type: raw.prompt.type ?? 'info',
    };
  }
  return edge;
}

/**
 * 同 path 去重：**后出现者覆盖先出现者**，即本页显式边覆盖继承来的同路径边，
 * 且保留在显式边的位置上。dependency 整体优先，其余保持声明顺序（稳定排序）。
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
 * 解析某页最终生效的引用边：展开 inherit、补默认 mode、去重排序。
 * `lookup` 注入页面 frontmatter，便于在 node:test 里喂假数据。
 */
export function resolveReferencesWith(
  slugs: string[],
  lookup: ReferenceLookup,
  warn?: ReferenceWarn,
): ResolvedReferenceEdge[] {
  void warn;
  const raw = collectRawEdges(slugs, lookup, 0, new Set());
  if (raw.length === 0) return [];
  return dedupeAndSort(raw.map((edge) => finalizeEdge(edge)));
}

export type Referrer = {
  url: string;
  title: string;
  icon?: string;
  /** 服务端预格式化的「MM-DD HH:mm」 */
  updatedLabel?: string;
};

export type BacklinkEntry = Referrer & {
  /** 只传本页**显式**声明的边；inherit 展开出来的不计入反查 */
  explicitPaths: string[];
};

/**
 * 反查索引：目标 path → 引用它的页面列表（按标题排序）。
 *
 * 只吃显式边。若 inherit 展开的边也计入，平台连接器一旦普遍写 `inherit`，
 * 该平台授权页的「被引用」会膨胀成全部连接器（几十上百条）。
 * 平台 index 的显式声明就是这批连接器在反查里的代表。
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
