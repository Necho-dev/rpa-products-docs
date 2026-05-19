/** 修剪后的环境变量；空串视为未设置 */
function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

/**
 * 文档站对外展示名称（导航、RSS、OG、订阅发现等）。
 * 在 `.env.local` 中设置 `NEXT_PUBLIC_SITE_NAME`。
 */
export const siteName = trimEnv('NEXT_PUBLIC_SITE_NAME') ?? 'RPA公共知识库';

/** RSS / 站点简介（未设置时用站点名拼接默认文案） */
export function getSiteDescription(): string {
  return trimEnv('NEXT_PUBLIC_SITE_DESCRIPTION') ?? `${siteName} 文档站页面更新订阅`;
}

/**
 * 若已配置 `NEXT_PUBLIC_SITE_URL` 则返回（无默认值），供按请求推断站点根等场景。
 * 生产环境强烈建议配置，以便 RSS、MCP、OG 与 `inferSiteOrigin` 在反向代理后得到正确公网根地址。
 */
export function getPublicSiteUrlIfSet(): string | undefined {
  const raw = trimEnv('NEXT_PUBLIC_SITE_URL');
  return raw ? stripTrailingSlash(raw) : undefined;
}

/**
 * 对外站点根 URL（RSS、metadata、绝对链接）。
 * 在 `.env.local` 中设置 `NEXT_PUBLIC_SITE_URL`；未设置时使用下方默认值。
 */
export function getPublicSiteUrl(): string {
  return getPublicSiteUrlIfSet() ?? 'https://rpa-hero.com';
}

/** 文档入口绝对 URL（站点根 + `/docs`） */
export function getPublicDocsUrl(): string {
  return `${getPublicSiteUrl()}${docsRoute}`;
}

/**
 * 从 blob URL 模板推导仓库首页（去掉 `/blob/` 或 GitLab 的 `/-/blob/` 及其后路径）。
 * 已与模板使用同一前缀时，无需再单独配置 `NEXT_PUBLIC_GIT_REPO_WEB_URL`。
 */
function deriveGitRepositoryWebUrlFromBlobTemplate(template: string): string | undefined {
  const sep = '/-/blob/';
  const idx = template.indexOf(sep);
  if (idx !== -1) return stripTrailingSlash(template.slice(0, idx));
  const sep2 = '/blob/';
  const j = template.indexOf(sep2);
  if (j !== -1) return stripTrailingSlash(template.slice(0, j));
  return undefined;
}

/**
 * 远程 Git 仓库首页 URL（导航栏图标链接）。
 * 优先读 `NEXT_PUBLIC_GIT_REPO_WEB_URL`；未设置时若已配置 `NEXT_PUBLIC_GIT_BLOB_URL_TEMPLATE`，则从模板推导。
 */
export function getGitRepositoryWebUrl(): string | undefined {
  const explicit = trimEnv('NEXT_PUBLIC_GIT_REPO_WEB_URL');
  if (explicit) return stripTrailingSlash(explicit);
  const template = trimEnv('NEXT_PUBLIC_GIT_BLOB_URL_TEMPLATE');
  if (!template) return undefined;
  return deriveGitRepositoryWebUrlFromBlobTemplate(template);
}

function getGitDefaultBranch(): string {
  return trimEnv('NEXT_PUBLIC_GIT_DEFAULT_BRANCH') ?? 'main';
}

/**
 * 单篇文档「在托管平台打开源文件」的完整 URL。
 * 在 `.env.local` 设置 `NEXT_PUBLIC_GIT_BLOB_URL_TEMPLATE`，占位符：`{branch}`、`{path}`。
 * `{path}` 为 `content/docs/` 下的相对路径（与 Fumadocs `page.path` 一致）。
 *
 * 示例 GitHub：`https://github.com/org/repo/blob/{branch}/content/docs/{path}`
 * 示例 GitLab：`https://gitlab.com/org/repo/-/blob/{branch}/content/docs/{path}`
 * 示例 Codeup：按控制台「浏览文件」复制 blob 链接，把分支与文件名换成占位符。
 */
export function getGitBlobEditUrlForDocPath(pagePath: string): string | undefined {
  const template = trimEnv('NEXT_PUBLIC_GIT_BLOB_URL_TEMPLATE');
  if (!template) return undefined;
  const branch = getGitDefaultBranch();
  const path = pagePath.replace(/^\/+/, '');
  return template.replaceAll('{branch}', branch).replaceAll('{path}', path);
}
