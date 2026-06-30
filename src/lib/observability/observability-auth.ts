import type { NextRequest } from 'next/server';
import {
  DOCS_MCP_TOKEN_COOKIE,
  DOCS_SESSION_COOKIE,
} from '@/lib/auth/cookie-names';
import { gateSsoActive, resolveAuthContext } from '@/lib/auth/auth-core';
import {
  readAccessUserFromCookieHeader,
  readCubeOriginFromCookieHeader,
  readSessionFromCookieHeader,
} from '@/lib/auth/session';

/** jsonl：认证凭证来源（与 Cookie 名一致，兼容 DOCSESSION / DOCMCPTOKEN） */
export type ObservabilityAuthorization =
  | typeof DOCS_SESSION_COOKIE
  | typeof DOCS_MCP_TOKEN_COOKIE;

export type ObservabilityAuthFields = {
  /** 访问用户：优先 ACCESSUSER Cookie，SSO 门禁时从 DOCSESSION / DOCMCPTOKEN 解析 */
  accessUser?: string;
  /** 魔方来源：优先 ACCESSORIGIN Cookie */
  accessOrigin?: string;
  /** jsonl only：有效认证时的凭证类型（stdout 不打印） */
  authorization?: ObservabilityAuthorization;
};

function compactAuthFields(fields: ObservabilityAuthFields): ObservabilityAuthFields {
  return {
    ...(fields.accessUser ? { accessUser: fields.accessUser } : {}),
    ...(fields.accessOrigin ? { accessOrigin: fields.accessOrigin } : {}),
    ...(fields.authorization ? { authorization: fields.authorization } : {}),
  };
}

/**
 * 解析可观测身份：
 * - accessUser / accessOrigin：Cookie 优先；SSO 开启且无 Cookie 用户名时从 token 解析
 * - authorization：仅 jsonl；门禁验签通过时标记 DOCSESSION 或 DOCMCPTOKEN
 */
export function resolveObservabilityLogAuth(
  request: NextRequest | Request,
): ObservabilityAuthFields {
  const cookieHeader = request.headers.get('cookie');
  const accessUser = readAccessUserFromCookieHeader(cookieHeader) ?? undefined;
  const accessOrigin = readCubeOriginFromCookieHeader(cookieHeader) ?? undefined;

  if (gateSsoActive()) {
    const ctx = resolveAuthContext(request);
    const sessionOk = Boolean(ctx.session && !ctx.sessionNeedsReauth);
    if (sessionOk && ctx.session) {
      return compactAuthFields({
        accessUser: accessUser ?? ctx.session.u,
        accessOrigin,
        authorization: DOCS_SESSION_COOKIE,
      });
    }
    if (ctx.mcp) {
      return compactAuthFields({
        accessUser: accessUser ?? ctx.mcp.u,
        accessOrigin,
        authorization: DOCS_MCP_TOKEN_COOKIE,
      });
    }
    if (ctx.session) {
      return compactAuthFields({
        accessUser: accessUser ?? ctx.session.u,
        accessOrigin,
      });
    }
    return compactAuthFields({ accessUser, accessOrigin });
  }

  const session = readSessionFromCookieHeader(cookieHeader);
  if (session?.u) {
    return compactAuthFields({
      accessUser: accessUser ?? session.u,
      accessOrigin,
      authorization: DOCS_SESSION_COOKIE,
    });
  }
  return compactAuthFields({ accessUser, accessOrigin });
}

/** stdout：accessUser / accessOrigin（不含 authorization） */
export function resolveObservabilityStdoutIdentity(
  request: NextRequest | Request,
): Pick<ObservabilityAuthFields, 'accessUser' | 'accessOrigin'> {
  const auth = resolveObservabilityLogAuth(request);
  return compactAuthFields({
    accessUser: auth.accessUser,
    accessOrigin: auth.accessOrigin,
  });
}

export function mergeObservabilityAuth<T extends object>(
  entry: T,
  auth: ObservabilityAuthFields,
): T & ObservabilityAuthFields {
  return {
    ...entry,
    ...(auth.accessUser ? { accessUser: auth.accessUser } : {}),
    ...(auth.accessOrigin ? { accessOrigin: auth.accessOrigin } : {}),
    ...(auth.authorization ? { authorization: auth.authorization } : {}),
  };
}

/** jsonl 落盘：去掉 stdout 不展示的 authorization 之外无额外变换 */
export function toObservabilityJsonlEntry<T extends ObservabilityAuthFields>(entry: T): T {
  return entry;
}
