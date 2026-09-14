/**
 * 知识库站点运行时配置。只在服务端读取。
 * 客户端组件禁止 import 本文件（会把 NEXT_PUBLIC_ 回退编进 bundle）。
 */

function trimValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

function firstEnv(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const t = trimValue(value);
    if (t) return t;
  }
  return undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * 文档站对外展示名称（导航、RSS、OG、订阅发现等）。
 * `KNOWLEDGE_SITE_NAME`，回退已弃用的 `NEXT_PUBLIC_SITE_NAME`。
 */
export function getSiteName(): string {
  return (
    firstEnv(process.env.KNOWLEDGE_SITE_NAME, process.env.NEXT_PUBLIC_SITE_NAME) ??
    'RPA公共知识库'
  );
}

/** RSS / 站点简介（未设置时用站点名拼接默认文案） */
export function getSiteDescription(): string {
  return (
    firstEnv(process.env.KNOWLEDGE_SITE_DESCRIPTION, process.env.NEXT_PUBLIC_SITE_DESCRIPTION) ??
    `${getSiteName()} 文档站页面更新订阅`
  );
}

/**
 * 已配置的 canonical 站点根（无默认值）。
 * `KNOWLEDGE_SITE_URL`，回退已弃用的 `NEXT_PUBLIC_SITE_URL`。
 */
export function getPublicSiteUrlIfSet(): string | undefined {
  const raw = firstEnv(process.env.KNOWLEDGE_SITE_URL, process.env.NEXT_PUBLIC_SITE_URL);
  return raw ? stripTrailingSlash(raw) : undefined;
}

/**
 * 对外站点根, 未配置时返回 undefined
 */
export function getPublicSiteUrl(): string | undefined {
  return getPublicSiteUrlIfSet();
}

/** 文档入口绝对 URL；未配置站点根时返回相对 `/docs` */
export function getPublicDocsUrl(): string {
  const root = getPublicSiteUrlIfSet();
  return root ? `${root}/docs` : '/docs';
}

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
 * `KNOWLEDGE_GIT_REPO_WEB_URL`，回退 `NEXT_PUBLIC_GIT_REPO_WEB_URL`；
 * 未设置时从 blob 模板推导。
 */
export function getGitRepositoryWebUrl(): string | undefined {
  const explicit = firstEnv(
    process.env.KNOWLEDGE_GIT_REPO_WEB_URL,
    process.env.NEXT_PUBLIC_GIT_REPO_WEB_URL,
  );
  if (explicit) return stripTrailingSlash(explicit);
  const template = firstEnv(
    process.env.KNOWLEDGE_GIT_BLOB_URL_TEMPLATE,
    process.env.NEXT_PUBLIC_GIT_BLOB_URL_TEMPLATE,
  );
  if (!template) return undefined;
  return deriveGitRepositoryWebUrlFromBlobTemplate(template);
}

function getGitDefaultBranch(): string {
  return (
    firstEnv(process.env.KNOWLEDGE_GIT_DEFAULT_BRANCH, process.env.NEXT_PUBLIC_GIT_DEFAULT_BRANCH) ??
    'main'
  );
}

/**
 * 单篇文档「在托管平台打开源文件」的完整 URL。
 * 占位符：`{branch}`、`{path}`（`content/docs/` 下相对路径）。
 */
export function getGitBlobEditUrlForDocPath(pagePath: string): string | undefined {
  const template = firstEnv(
    process.env.KNOWLEDGE_GIT_BLOB_URL_TEMPLATE,
    process.env.NEXT_PUBLIC_GIT_BLOB_URL_TEMPLATE,
  );
  if (!template) return undefined;
  const branch = getGitDefaultBranch();
  const path = pagePath.replace(/^\/+/, '');
  return template.replaceAll('{branch}', branch).replaceAll('{path}', path);
}

/** Agent Skill / MCP name 回退（次于 `MCP_SERVER_NAME`） */
export function getKnowledgeSkillName(): string | undefined {
  return firstEnv(process.env.KNOWLEDGE_SKILL_NAME, process.env.NEXT_PUBLIC_SKILL_NAME);
}
