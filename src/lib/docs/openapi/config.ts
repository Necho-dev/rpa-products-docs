export const OPENAPI_PROXY_PATH = '/api/openapi-proxy';

const DEFAULT_PROXY_ORIGINS = [
  'http://127.0.0.1:8000',
  'http://localhost:8000',
];

/** 站点级默认 Playground 代理地址; 未开启则为 undefined(直连 servers) */
export function getOpenApiProxyUrl(): string | undefined {
  const explicit = process.env.DOCS_OPENAPI_PROXY_URL?.trim();
  if (explicit) return explicit;
  if (process.env.DOCS_OPENAPI_PROXY_ENABLED === 'true') return OPENAPI_PROXY_PATH;
  return undefined;
}

export function getOpenApiProxyAllowedOrigins(): string[] {
  const extra =
    process.env.DOCS_OPENAPI_PROXY_ALLOWED_ORIGINS?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  return [...new Set([...DEFAULT_PROXY_ORIGINS, ...extra])];
}

export function resolveDirectiveProxyUrl(
  proxy: boolean | string | undefined,
): string | undefined {
  if (proxy === false) return undefined;
  if (proxy === true) return OPENAPI_PROXY_PATH;
  if (typeof proxy === 'string' && proxy.trim()) return proxy.trim();
  return getOpenApiProxyUrl();
}
