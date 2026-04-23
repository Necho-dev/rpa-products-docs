import { getPublicSiteUrlIfSet } from '@/lib/shared';

/** Public site origin for absolute links (docs MCP, AI tools). */
export function inferSiteOrigin(request: Request): string {
  const fromEnv = getPublicSiteUrlIfSet();
  if (fromEnv) return fromEnv;

  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const proto = (forwardedProto ?? url.protocol.replace(/:$/, '')).replace(/:$/, '');
  return `${proto}://${forwardedHost}`.replace(/\/$/, '');
}
