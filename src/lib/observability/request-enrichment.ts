import {
  DOCS_MCP_TOKEN_COOKIE,
  DOCS_SESSION_COOKIE,
} from '@/lib/auth/cookie-names';
import type { ObservabilityAuthorization } from '@/lib/observability/observability-auth';

/**
 * 鉴权方式分桶（低基数，便于 Group By）。
 * - session：浏览器 DOCSESSION
 * - mcp_token：MCP Bearer / DOCMCPTOKEN
 * - embed：魔方嵌入验签通道
 * - anonymous：未识别凭证
 */
export type AuthMethod = 'session' | 'mcp_token' | 'embed' | 'anonymous';

export function resolveAuthMethod(input: {
  authorization?: ObservabilityAuthorization;
  outcome?: string;
  path?: string;
}): AuthMethod {
  if (
    input.outcome === 'embed_ok' ||
    input.outcome === 'embed_denied' ||
    input.outcome === 'embed_block' ||
    input.path?.startsWith('/embed/')
  ) {
    return 'embed';
  }
  if (input.authorization === DOCS_MCP_TOKEN_COOKIE) return 'mcp_token';
  if (input.authorization === DOCS_SESSION_COOKIE) return 'session';
  return 'anonymous';
}

/** 是否 Next.js RSC / Flight 请求（query `_rsc`） */
export function isRscRequest(query?: string): boolean {
  if (!query) return false;
  // sanitizeQuery 仍保留 _rsc= 值（非敏感 key）
  return /(?:^|&)_rsc=/.test(query) || query.startsWith('_rsc=');
}

/**
 * 从入站头读取 geo / ASN（依赖前置反代写入；本服务不做 IP 库查询）。
 * 常见：Cloudflare / Nginx 地理模块 / 自定义网关。
 */
export function extractGeoAsn(headers: Headers): {
  geoCountry?: string;
  geoRegion?: string;
  asn?: string;
} {
  const country =
    headers.get('cf-ipcountry')?.trim() ||
    headers.get('x-country-code')?.trim() ||
    headers.get('x-geo-country')?.trim() ||
    headers.get('x-vercel-ip-country')?.trim() ||
    undefined;

  const region =
    headers.get('cf-region')?.trim() ||
    headers.get('x-region-code')?.trim() ||
    headers.get('x-geo-region')?.trim() ||
    headers.get('x-vercel-ip-country-region')?.trim() ||
    undefined;

  const asnRaw =
    headers.get('cf-ipasn')?.trim() ||
    headers.get('x-asn')?.trim() ||
    headers.get('x-ip-asn')?.trim() ||
    headers.get('x-connecting-asn')?.trim() ||
    undefined;

  const asn = asnRaw
    ? asnRaw.replace(/^AS/i, '').replace(/\D/g, '') || undefined
    : undefined;

  return {
    geoCountry: country && country.toUpperCase() !== 'XX' ? country.toUpperCase() : undefined,
    geoRegion: region || undefined,
    asn: asn || undefined,
  };
}
