import { isCubeSsoEnabled } from '@/lib/auth/auth-config';
import { docsRoute } from '@/lib/core/shared';

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

/**
 * User-Agent 门禁开关。
 * - 显式 `DOCS_USER_AGENT_GATE_ENABLED=true|false` 优先
 * - 否则：开发环境默认关闭（便于 curl 调试）；生产且 SSO 开启时默认开启
 */
export function isUserAgentGateEnabled(): boolean {
  const explicit = trimEnv('DOCS_USER_AGENT_GATE_ENABLED');
  if (explicit !== undefined) {
    return explicit === '1' || explicit.toLowerCase() === 'true' || explicit.toLowerCase() === 'yes';
  }
  if (process.env.NODE_ENV === 'development') return false;
  return isCubeSsoEnabled();
}

/**
 * 常见脚本/调试客户端 UA 特征（小写子串匹配）。
 * 注意：嵌入 BFF 可能使用 httpx，须在 proxy 中于嵌入验签通过后再放行（不进入本门禁）。
 */
const BLOCKED_UA_SUBSTRINGS = [
  'curl/',
  'curl ',
  'python-requests',
  'python-urllib',
  'httpx/',
  'aiohttp/',
  'apifox',
  'postman',
  'insomnia',
  'httpie/',
  'wget/',
  'scrapy/',
  'go-http-client',
  'java/',
  'okhttp',
  'libwww-perl',
  'axios/',
  'node-fetch',
  'undici',
] as const;

/** API / 机器可读导出路由前缀，不做 UA 拦截 */
const UA_GATE_EXEMPT_PREFIXES = [
  '/auth/',
  '/health',
  '/oauth/',
  '/api/',
  '/llms',
  '/skills/',
  '/.well-known/',
  '/_next/',
] as const;

/**
 * 是否应对当前路径做 User-Agent 校验（浏览器向页面与公开图片）。
 */
export function isUserAgentGatedPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/mcp/deeplink') return true;
  if (pathname.startsWith('/resources/images/')) return true;
  if (pathname === docsRoute || pathname.startsWith(`${docsRoute}/`)) return true;
  return false;
}

export function isUserAgentGatedPathExempt(pathname: string): boolean {
  if (pathname === '/mcp') return true;
  return UA_GATE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function shouldApplyUserAgentGate(pathname: string): boolean {
  if (!isUserAgentGatedPath(pathname)) return false;
  if (isUserAgentGatedPathExempt(pathname)) return false;
  return true;
}

export function isBlockedUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true;
  const ua = userAgent.toLowerCase();
  return BLOCKED_UA_SUBSTRINGS.some((needle) => ua.includes(needle));
}

export function userAgentForbiddenResponse(): Response {
  return Response.json(
    { error: 'forbidden', message: '请使用浏览器访问；脚本/调试客户端已被拒绝' },
    {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
}
