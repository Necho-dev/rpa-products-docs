import { isPrivateDocAccessConfigured } from '@/lib/docs/access/doc-access';
import type { SearchTag } from '@/lib/docs/search/search-tags';
import { docsRoute, getSiteDescription, siteName } from '@/lib/core/shared';

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

/** MCP / Agent Skill 标识：小写字母、数字、连字符，≤64 字符 */
export function slugifyMcpId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * MCP Server `name` 字段（协议标识）。
 * 优先 `MCP_SERVER_NAME`，其次 `NEXT_PUBLIC_SKILL_NAME`，再回退为站点名 slug。
 */
export function getMcpServerName(): string {
  const explicit = trimEnv('MCP_SERVER_NAME');
  if (explicit) return slugifyMcpId(explicit);

  const skill = trimEnv('NEXT_PUBLIC_SKILL_NAME');
  if (skill) return slugifyMcpId(skill);

  return slugifyMcpId(siteName) || 'rpa-products-docs';
}

/** MCP Server `version` 字段 */
export function getMcpServerVersion(): string {
  return trimEnv('MCP_SERVER_VERSION') ?? '1.0.0';
}

/**
 * Cursor / Claude 一键安装等 UI 展示名。
 * 优先 `MCP_DISPLAY_NAME`，其次 `NEXT_PUBLIC_SITE_NAME`。
 */
export function getMcpDisplayName(): string {
  return trimEnv('MCP_DISPLAY_NAME') ?? siteName;
}

function buildPartitionsBlock(searchTags: SearchTag[]): string {
  if (searchTags.length === 0) return '';
  const lines = searchTags.map((t) => `- ${t.value}: ${t.label}`);
  return `

Documentation partitions (pass as search_docs.tag to narrow scope):
${lines.join('\n')}`;
}

function buildToolsBlock(searchTags: SearchTag[]): string {
  const tagNote =
    searchTags.length > 0
      ? ` Supports optional tag filter: ${searchTags.map((t) => t.value).join(' | ')}.`
      : '';
  return `Tools:
- list_docs — catalog all pages (paths, titles, descriptions).
- search_docs — full-text search when the user does not know an exact path.${tagNote}
- get_docs_meta — title, description, URL, and TOC without full body (saves tokens).
- get_docs_content — full page content for a known path. Image src values are content/docs-relative paths; use get_docs_image for binaries.
- get_docs_image — fetch a docs screenshot as MCP image content. If using legacy PRIVATE_ACCESS_TOKEN without Authorization, pass page= for a page you can read that references the image.

Typical flow: search_docs or list_docs → get_docs_meta (optional) → get_docs_content → get_docs_image (if a figure matters).`;
}

/**
 * MCP Server `instructions`（供客户端展示给 Agent）。
 * 若设置 `MCP_INSTRUCTIONS` 则完全覆盖；否则根据站点 env + 分区列表自动生成。
 */
export function buildMcpServerInstructions(
  siteOrigin: string,
  searchTags: SearchTag[] = [],
): string {
  const override = trimEnv('MCP_INSTRUCTIONS');
  if (override) return override;

  const description = getSiteDescription();
  const privateNote = isPrivateDocAccessConfigured()
    ? '\n\nPrivate documentation requires `Authorization: Bearer <token>` or an authenticated browser session via `/docs/access`.'
    : '';

  return `This MCP server exposes documentation for ${siteName}.
${description}

Site URL: ${siteOrigin.replace(/\/$/, '')}
Base docs path: ${docsRoute}.${privateNote}${buildPartitionsBlock(searchTags)}

${buildToolsBlock(searchTags)}`;
}
