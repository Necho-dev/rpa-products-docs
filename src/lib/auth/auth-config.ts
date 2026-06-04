export {
  DOCS_CUBE_ORIGIN_COOKIE,
  DOCS_CUBE_USER_COOKIE,
  DOCS_MCP_TOKEN_COOKIE,
  DOCS_SESSION_COOKIE,
} from '@/lib/auth/cookie-names';

function trimEnv(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

function envInt(key: string, fallback: number): number {
  const raw = trimEnv(key);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEFAULT_SESSION_TTL = 30 * 24 * 3600;
const DEFAULT_MCP_TOKEN_TTL = 30 * 24 * 3600;
const DEFAULT_SESSION_REAUTH_AFTER = 7 * 24 * 3600;
const DEFAULT_SIGNATURE_WINDOW_MS = 180_000;

export function isCubeSsoEnabled(): boolean {
  const raw = trimEnv('DOCS_CUBE_SSO_ENABLED');
  if (!raw) return false;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

export function sessionSecret(): string | undefined {
  return trimEnv('DOCS_SESSION_SECRET');
}

export function secretsFilePath(): string {
  return trimEnv('DOCS_SECRETS_FILE') ?? '/opt/yuce/docs/secrets.json';
}

export function sessionTtlSec(): number {
  return envInt('DOCS_SESSION_TTL', DEFAULT_SESSION_TTL);
}

export function sessionRefreshAfterSec(): number {
  return Math.floor(sessionTtlSec() / 2);
}

export function sessionReauthAfterSec(): number {
  return envInt('DOCS_SESSION_REAUTH_AFTER', DEFAULT_SESSION_REAUTH_AFTER);
}

export function mcpTokenTtlSec(): number {
  return envInt('DOCS_MCP_TOKEN_TTL', DEFAULT_MCP_TOKEN_TTL);
}

export function signatureWindowMs(): number {
  return envInt('DOCS_SIGNATURE_WINDOW_MS', DEFAULT_SIGNATURE_WINDOW_MS);
}

export function cubeOriginPatternSource(): string {
  return (
    trimEnv('DOCS_CUBE_ORIGIN_PATTERN') ??
    String.raw`^https?://[A-Za-z0-9][A-Za-z0-9\-.]*(:\d+)?$`
  );
}

/** 可选：无 ACCESSORIGIN Cookie 时，登录引导页 SSO 按钮默认跳转的魔方地址 */
export function cubeDefaultOrigin(): string | undefined {
  return trimEnv('DOCS_CUBE_DEFAULT_ORIGIN');
}

export function mcpResourceUrl(siteOrigin: string): string {
  const fromEnv = trimEnv('DOCS_MCP_RESOURCE');
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return `${siteOrigin.replace(/\/$/, '')}/mcp`;
}

export function isSecureCookieRequest(request: Request): boolean {
  const proto =
    request.headers.get('x-forwarded-proto') ??
    (request.url.startsWith('https://') ? 'https' : 'http');
  return proto === 'https';
}
