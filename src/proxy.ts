import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { gateSsoActive, isGateAuthenticated } from '@/lib/auth/auth-core';
import {
  appendSessionCookie,
  readSessionFromCookieHeader,
  safeRedirectPath,
  sessionNeedsSilentRefresh,
} from '@/lib/auth/session';
import { docsContentRoute, docsRoute } from '@/lib/core/shared';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.mdx`,
  `${docsContentRoute}{/*path}.md`,
);

const MCP_UNAUTHORIZED_BODY = {
  error: 'unauthorized',
  message: '请在文档站登录后访问 /mcp/deeplink 重新获取 MCP Bearer',
};

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/auth/')) return true;
  if (pathname === '/health') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/.well-known/')) return true;
  if (pathname.startsWith('/oauth/')) return true;
  if (/\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$/i.test(pathname)) return true;
  return false;
}

function maybeRefreshSession(response: NextResponse, request: NextRequest): NextResponse {
  const session = readSessionFromCookieHeader(request.headers.get('cookie'));
  if (session && sessionNeedsSilentRefresh(session)) {
    const headers = new Headers(response.headers);
    appendSessionCookie(headers, request, {
      u: session.u,
      s: session.s,
      iat: session.iat,
    });
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  return response;
}

function applyCubeSsoGate(request: NextRequest): NextResponse | null {
  if (!gateSsoActive()) return null;

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return null;

  const authed = isGateAuthenticated(request);

  if (pathname === '/mcp') {
    if (!authed) {
      return NextResponse.json(MCP_UNAUTHORIZED_BODY, {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer realm="mcp"' },
      });
    }
    return maybeRefreshSession(NextResponse.next(), request);
  }

  if (!authed) {
    const redirect = safeRedirectPath(`${pathname}${request.nextUrl.search}`);
    const login = new URL('/auth/login', request.url);
    login.searchParams.set('redirect', redirect);
    return NextResponse.redirect(login);
  }

  return maybeRefreshSession(NextResponse.next(), request);
}

export function proxy(request: NextRequest) {
  const gate = applyCubeSsoGate(request);
  if (gate) return gate;

  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const rewritten = rewriteDocs(request.nextUrl.pathname);
    if (rewritten) {
      return NextResponse.rewrite(new URL(rewritten, request.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
