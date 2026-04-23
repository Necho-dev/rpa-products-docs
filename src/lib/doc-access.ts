import { createHmac, timingSafeEqual } from 'node:crypto';

/** HttpOnly Cookie，与服务端配置的令牌派生绑定（不存放明文令牌） */
export const PRIVATE_DOC_COOKIE = 'fd_private_docs';

const HMAC_SALT = 'fumadocs-private-docs-session-v1';

export type DocAccessContext = {
  /** 已持有 Bearer 或与令牌绑定的 Cookie */
  canAccessPrivate: boolean;
};

function configuredToken(): string | undefined {
  return process.env.DOCS_PRIVATE_ACCESS_TOKEN?.trim() || undefined;
}

/** 是否启用私有文档（配置了 `DOCS_PRIVATE_ACCESS_TOKEN`） */
export function isPrivateDocAccessConfigured(): boolean {
  return Boolean(configuredToken());
}

/** 会话 Cookie 期望值（与令牌绑定的确定性摘要） */
export function computePrivateDocSessionCookie(): string {
  const t = configuredToken();
  if (!t) return '';
  return createHmac('sha256', t).update(HMAC_SALT).digest('base64url');
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function bearerMatches(token: string | undefined, bearer: string): boolean {
  const t = token;
  if (!t) return false;
  return timingSafeCompare(bearer, t);
}

/** 从 HTTP 请求解析 Cookie / Bearer，得到访问上下文（用于 Route Handler、MCP） */
export function getDocAccessContext(req: Request): DocAccessContext {
  if (!isPrivateDocAccessConfigured()) {
    return { canAccessPrivate: true };
  }
  const token = configuredToken()!;

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim();
    if (bearerMatches(token, bearer)) {
      return { canAccessPrivate: true };
    }
  }

  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${PRIVATE_DOC_COOKIE}=([^;]*)`),
  );
  const raw = match?.[1];
  const cookieVal = raw ? decodeURIComponent(raw) : '';
  const expected = computePrivateDocSessionCookie();
  if (expected && cookieVal && timingSafeCompare(cookieVal, expected)) {
    return { canAccessPrivate: true };
  }

  return { canAccessPrivate: false };
}
