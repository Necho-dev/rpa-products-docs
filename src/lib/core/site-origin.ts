import { mcpResourceUrl } from '@/lib/auth/auth-config';
import { getPublicSiteUrl, getPublicSiteUrlIfSet } from '@/lib/core/shared';

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** 从当前 HTTP 请求推断站点根（不含路径）。 */
export function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const proto = (forwardedProto ?? url.protocol.replace(/:$/, '')).replace(/:$/, '');
  return stripTrailingSlash(`${proto}://${forwardedHost}`);
}

function parseSiteOrigin(origin: string): { proto: string; hostname: string; port: string } | null {
  try {
    const url = new URL(origin);
    return {
      proto: url.protocol.replace(/:$/, ''),
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    };
  } catch {
    return null;
  }
}

function buildOrigin(proto: string, hostname: string, port: string): string {
  const defaultPort = proto === 'https' ? '443' : '80';
  const host = port === defaultPort ? hostname : `${hostname}:${port}`;
  return `${proto}://${host}`;
}

/** 开发环境：localhost / 127.0.0.1 与 NEXT_PUBLIC_SITE_URL 视为同一站点（同端口）。 */
function devOriginAliases(...origins: Array<string | undefined>): string[] {
  if (!isDevelopment()) return [];

  const parsed = origins
    .filter((origin): origin is string => Boolean(origin))
    .map(parseSiteOrigin)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (parsed.length === 0) return [];

  const { proto, port } = parsed[0];
  const out = new Set<string>();
  for (const host of LOCAL_DEV_HOSTS) {
    if (host.startsWith('[')) continue;
    out.add(buildOrigin(proto, host, port));
  }
  for (const item of parsed) {
    out.add(buildOrigin(item.proto, item.hostname, item.port));
  }
  return [...out];
}

/**
 * 运行时站点根：MCP aud、deeplink、鉴权等。
 * - 开发：优先当前请求 Host（支持 localhost / 局域网 IP 混用）
 * - 生产：优先 NEXT_PUBLIC_SITE_URL（反代场景），否则回退请求 Host
 */
export function inferSiteOrigin(request: Request): string {
  const fromRequest = originFromRequest(request);
  const fromEnv = getPublicSiteUrlIfSet();

  if (isDevelopment()) return fromRequest;
  if (fromEnv) return fromEnv;
  return fromRequest;
}

/**
 * OG 渲染用站点根：build 期优先 env，避免读 request headers 导致 route 标为 dynamic。
 */
export function resolveOgSiteOrigin(req?: Request): string {
  const fromEnv = getPublicSiteUrlIfSet();
  if (fromEnv) return fromEnv;
  if (req) return inferSiteOrigin(req);
  return getPublicSiteUrl();
}

/** MCP Bearer `aud` 候选：开发环境允许 localhost 与 NEXT_PUBLIC_SITE_URL 互通。 */
export function mcpResourceUrlsForRequest(request: Request): string[] {
  const fromRequest = originFromRequest(request);
  const fromEnv = getPublicSiteUrlIfSet();
  const runtimeOrigin = inferSiteOrigin(request);

  const urls = new Set<string>([
    mcpResourceUrl(runtimeOrigin),
    mcpResourceUrl(fromRequest),
  ]);

  if (fromEnv) {
    urls.add(mcpResourceUrl(fromEnv));
  }

  for (const origin of devOriginAliases(fromRequest, fromEnv, runtimeOrigin)) {
    urls.add(mcpResourceUrl(origin));
  }

  return [...urls];
}

export function mcpAudMatches(tokenAud: string, expectedAud: string | readonly string[]): boolean {
  const expected = Array.isArray(expectedAud) ? expectedAud : [expectedAud];
  if (expected.includes(tokenAud)) return true;

  if (!isDevelopment()) return false;

  const tokenOrigin = mcpResourceToOrigin(tokenAud);
  if (!tokenOrigin) return false;
  const tokenResource = parseSiteOrigin(tokenOrigin);
  if (!tokenResource) return false;

  return expected.some((aud) => {
    const resourceOrigin = mcpResourceToOrigin(aud);
    if (!resourceOrigin) return false;
    const resource = parseSiteOrigin(resourceOrigin);
    if (!resource) return false;
    if (resource.proto !== tokenResource.proto || resource.port !== tokenResource.port) {
      return false;
    }
    const hosts = new Set([resource.hostname, tokenResource.hostname]);
    const hasLocal = [...hosts].some((host) => LOCAL_DEV_HOSTS.has(host));
    const hasLan = [...hosts].some((host) =>
      /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host),
    );
    return hasLocal && hasLan;
  });
}

function mcpResourceToOrigin(aud: string): string | null {
  try {
    const url = new URL(aud);
    return stripTrailingSlash(`${url.protocol}//${url.host}`);
  } catch {
    return null;
  }
}
