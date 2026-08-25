/**
 * 把 doc-references-core 的纯解析结果接到 fumadocs `source` 上：
 * 补目标页标题/摘要/图标/封面/更新时间，按访问权限过滤，并维护「被引用」反查索引。
 */
import { cache } from 'react';
import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import {
  buildBacklinks,
  normalizeReferencesInput,
  resolveReferencesWith,
  type BacklinkEntry,
  type ReferenceBadge,
  type ReferenceKind,
  type ReferenceLookup,
  type ReferenceMode,
  type ReferencePrompt,
  type Referrer,
  type ResolvedReferenceEdge,
} from '@/lib/docs/doc-references-core';
import { isDocPageAccessible, resolveDocPage } from '@/lib/docs/docs-site-tools';
import { buildPageCoverUrl } from '@/lib/docs/source/resolve-module-cover-url';
import { source } from '@/lib/docs/source/source';

type DocPage = ReturnType<typeof source.getPages>[number];

export type ResolvedReference = {
  kind: ReferenceKind;
  mode: ReferenceMode;
  url: string;
  title: string;
  description?: string;
  /** kind 默认四字徽章，可被 frontmatter badge 覆盖 */
  badge: ReferenceBadge;
  /** 作者自定义提示，如「请提前完成授权配置」 */
  prompt?: ReferencePrompt;
  /** 原始 icon 名，由 client 卡片用 renderDocIcon 解析 */
  icon?: string;
  iconColor?: string;
  /** preview 模式的封面；带 MODULE_COVER_CACHE_VERSION，避开 OG immutable 缓存 */
  coverUrl: string;
  lastModified?: string;
  /** 服务端预格式化的「MM-DD HH:mm」，避免客户端时区导致 hydration 不一致 */
  updatedLabel?: string;
};

const updatedFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatUpdated(date: Date): string {
  return updatedFormatter.format(date).replace(/\//g, '-');
}

export type { Referrer };

const warned = new Set<string>();

/** 页面是 force-dynamic，每次请求都会重解析；同一条消息只喊一次，避免刷屏 */
function warnOnce(message: string): void {
  if (process.env.NODE_ENV === 'production') return;
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[doc-references] ${message}`);
}

const lookup: ReferenceLookup = (slugs) =>
  source.getPage(slugs.length ? slugs : undefined)?.data;

function iconOf(page: DocPage): { icon?: string; iconColor?: string } {
  const moduleIcon = page.data.module?.icon;
  const comp = typeof moduleIcon === 'string' ? moduleIcon : moduleIcon?.comp;
  const color = typeof moduleIcon === 'string' ? undefined : moduleIcon?.color;
  const name = (comp ?? page.data.icon)?.trim();

  const out: { icon?: string; iconColor?: string } = {};
  if (name) out.icon = name;
  if (color) out.iconColor = color;
  return out;
}

function toResolved(edge: ResolvedReferenceEdge, target: DocPage): ResolvedReference {
  const resolved: ResolvedReference = {
    kind: edge.kind,
    mode: edge.mode,
    badge: edge.badge,
    url: target.url,
    title: target.data.title ?? edge.path,
    coverUrl: buildPageCoverUrl(target.slugs),
    ...iconOf(target),
  };
  if (edge.prompt) resolved.prompt = edge.prompt;

  const description = target.data.description?.trim();
  if (description) resolved.description = description;

  const lastModified = target.data.lastModified;
  if (lastModified) {
    const date = new Date(lastModified);
    if (!Number.isNaN(date.getTime())) {
      resolved.lastModified = date.toISOString();
      resolved.updatedLabel = formatUpdated(date);
    }
  }

  return resolved;
}

/**
 * 本页出口引用。目标页不存在时 dev 告警并丢弃；当前访问者无权看时静默丢弃
 * （公开访客不该从卡片标题推断出存在这么一篇私有文档）。
 */
export function getPageReferences(
  page: DocPage,
  access: DocAccessContext,
): ResolvedReference[] {
  const edges = resolveReferencesWith([...page.slugs], lookup, warnOnce);
  if (edges.length === 0) return [];

  const out: ResolvedReference[] = [];
  for (const edge of edges) {
    const target = resolveDocPage(edge.path);
    if (!target) {
      warnOnce(`${page.url} 引用了不存在的页面 ${edge.path}`);
      continue;
    }
    if (target.url === page.url) continue;
    if (!isDocPageAccessible(target, access)) continue;
    out.push(toResolved(edge, target));
  }
  return out;
}

/**
 * 反查索引按请求算：dev 下 fumadocs HMR 重生成 `.source` 不会让模块级缓存失效，
 * 会一直返回旧结果。页面量级几百、每页只读一个 frontmatter 字段，重算很便宜。
 */
const getBacklinkIndex = cache((): Map<string, Referrer[]> => {
  const entries: BacklinkEntry[] = [];
  for (const page of source.getPages()) {
    // 只取显式边：inherit 展开的不进反查，否则平台授权页会被整平台连接器淹没
    const { edges } = normalizeReferencesInput(page.data.references);
    if (edges.length === 0) continue;

    const entry: BacklinkEntry = {
      url: page.url,
      title: page.data.title ?? page.url,
      explicitPaths: edges.map((edge) => edge.path),
    };
    const { icon } = iconOf(page);
    if (icon) entry.icon = icon;
    entries.push(entry);
  }
  return buildBacklinks(entries);
});

/** 谁引用了本页；按访问者权限过滤掉看不见的来源页 */
export function getPageBacklinks(page: DocPage, access: DocAccessContext): Referrer[] {
  const referrers = getBacklinkIndex().get(page.url);
  if (!referrers || referrers.length === 0) return [];

  return referrers.flatMap((referrer) => {
    const referrerPage = resolveDocPage(referrer.url);
    if (!referrerPage || !isDocPageAccessible(referrerPage, access)) return [];

    const out: Referrer = { url: referrer.url, title: referrer.title };
    if (referrer.icon) out.icon = referrer.icon;
    const lastModified = referrerPage.data.lastModified;
    if (lastModified) {
      const date = new Date(lastModified);
      if (!Number.isNaN(date.getTime())) out.updatedLabel = formatUpdated(date);
    }
    return [out];
  });
}
