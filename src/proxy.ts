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
import { resourcesRequireEmbedSign } from '@/lib/auth/auth-config';
import {
  EMBED_VERIFIED_CUBE_ORIGIN_HEADER,
  EMBED_VERIFIED_SH_HEADER,
  EMBED_VERIFIED_USER_HEADER,
  getEmbedRenderMode,
  stripClientEmbedVerifiedHeaders,
  verifyCubeEmbedRequest,
} from '@/lib/auth/cube-embed';
import {
  isBlockedUserAgent,
  isUserAgentGateEnabled,
  shouldApplyUserAgentGate,
} from '@/lib/auth/user-agent-gate';
import { applyOgDocGate, isOgDocsPath, isPublicOgDocsPath } from '@/lib/docs/og/proxy-gate';
import { finishAccessLog } from '@/lib/observability/access-log';
import { finishSsoLog, ssoOutcomeFromStatus } from '@/lib/observability/sso-audit-log';

/** 嵌入 HTML 路由前缀（对应 src/app/embed/docs/[[...slug]]） */
const embedHtmlRoute = '/embed/docs';

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
  message: '请在登录后重新访问 /mcp/deeplink 获取 MCP Bearer Token',
};

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/auth/')) return true;
  if (pathname === '/health') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/.well-known/')) return true;
  if (pathname.startsWith('/oauth/')) return true;
  /** 开启资源验签后, 图片走 route handler 内 HMAC 校验, 不再视为 SSO 公开路径 */
  if (pathname.startsWith('/resources/images/')) {
    return !resourcesRequireEmbedSign();
  }
  /** /og/docs 文档 OG 走 applyOgDocGate 页级鉴权；公开文档 OG 仍视为 SSO 公开路径 */
  if (isOgDocsPath(pathname)) return isPublicOgDocsPath(pathname);
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

/**
 * 嵌入通道分流 (通道 A)
 *
 * 触发条件: `X-Render-Mode` 或 Query `render` 为 markdown / html。
 * - 验签(来源站 HMAC), 若失败直接 401, 禁止 302。
 * - 通过后 rewrite 到对应嵌入路由 (不经过 applyCubeSsoGate)。
 * - 图片路径 /resources/images/...*.png 被 matcher 直接排除, 不进入本函数, 无需额外处理。
 *
 * 安全说明:
 * - `x-embed-verified-sh` 头由本函数在验签通过后写入, 下游 route handler 信任此头。
 * - 外部请求若直接携带此头但未经本函数 (即直接访问 /llms.htm/ 或 /llms.mdx/), 会被 blockEmbedInternalRoutes() 拦截返回 404, 防止伪造绕过。
 */
function applyEmbedGate(request: NextRequest): NextResponse | null {
  const renderMode = getEmbedRenderMode(request);
  if (!renderMode) return null;

  // 仅对 /docs/** 路径启用嵌入通道
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(`${docsRoute}/`) && pathname !== docsRoute) return null;

  // 必须先验签
  const verified = verifyCubeEmbedRequest(request);
  if (!verified) {
    return NextResponse.json(
      { error: 'unauthorized', message: '来源站身份校验失败或签名已过期' },
      { status: 401 },
    );
  }

  // 将 X-Render-Mode 以及验签结果透传给下游
  const forwardHeaders = new Headers(request.headers);
  stripClientEmbedVerifiedHeaders(forwardHeaders);
  forwardHeaders.set(EMBED_VERIFIED_SH_HEADER, verified.sh);
  if (verified.user) forwardHeaders.set(EMBED_VERIFIED_USER_HEADER, verified.user);
  if (verified.cubeOrigin) {
    forwardHeaders.set(EMBED_VERIFIED_CUBE_ORIGIN_HEADER, verified.cubeOrigin);
  }

  if (renderMode === 'markdown') {
    // rewrite 到现有 llms.mdx/docs/[[...slug]] 路由
    const suffix = pathname === docsRoute ? '/index.md' : `${pathname.slice(docsRoute.length)}.md`;
    const target = new URL(`${docsContentRoute}${suffix}`, request.nextUrl);
    return NextResponse.rewrite(target, { request: { headers: forwardHeaders } });
  }

  // html：rewrite 到 llms.htm/docs 路由
  const suffix = pathname === docsRoute ? '/index' : pathname.slice(docsRoute.length);
  const target = new URL(`${embedHtmlRoute}${suffix}`, request.nextUrl);
  return NextResponse.rewrite(target, { request: { headers: forwardHeaders } });
}

/**
 * 拦截对嵌入内部路由的直接外部访问, 防止伪造 `x-embed-verified-sh` 头绕过鉴权
 *
 * `/embed/docs/**` 只应由 proxy rewrite 访问 (X-Render-Mode: html 通道),
 * 外部客户端直接访问此路径应得到 404 (避免暴露内部路由存在)
 *
 * 注意: `/llms.mdx/docs/**` 是对外公开的 Markdown 导出路由 (浏览器 / MCP 可直接访问),
 * 不在此拦截范围内; 该路由的嵌入场景通过 `x-embed-verified-sh` 头区分,
 * 无此头时走原有的 Cookie / Bearer 鉴权
 */
function blockEmbedInternalRoutes(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(`${embedHtmlRoute}/`) || pathname === embedHtmlRoute) {
    return new NextResponse(null, { status: 404 });
  }
  // 同时阻断旧路由的直接外部访问
  if (pathname.startsWith('/llms.htm/docs/') || pathname === '/llms.htm/docs') {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * User-Agent 门禁：拦截 curl / httpx / apifox 等脚本客户端。
 * - 嵌入通道（验签通过）已在 applyEmbedGate 提前返回，BFF 使用 httpx 不受影响。
 * - MCP / llms 导出 / auth 等 API 路径不在 gated 范围内。
 */
function applyUserAgentGate(request: NextRequest): NextResponse | null {
  if (!isUserAgentGateEnabled()) return null;

  const { pathname } = request.nextUrl;
  if (!shouldApplyUserAgentGate(pathname)) return null;

  if (isBlockedUserAgent(request.headers.get('user-agent'))) {
    return NextResponse.json(
      { error: 'forbidden', message: '请使用浏览器访问；脚本/调试客户端已被拒绝' },
      { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  return null;
}

export function proxy(request: NextRequest) {
  const started = Date.now();

  // 嵌入通道优先 (通道 A): 有 X-Render-Mode 时跳过 SSO Cookie 门禁
  const embedGate = applyEmbedGate(request);
  if (embedGate) {
    return finishAccessLog(
      request,
      embedGate,
      embedGate.status === 401 ? 'embed_denied' : 'embed_ok',
      started,
    );
  }

  // 阻断对嵌入内部路由的直接外部访问 (防止伪造 x-embed-verified-sh 绕过)
  const blockEmbed = blockEmbedInternalRoutes(request);
  if (blockEmbed) {
    return finishAccessLog(request, blockEmbed, 'embed_block', started);
  }

  const uaGate = applyUserAgentGate(request);
  if (uaGate) {
    return finishAccessLog(request, uaGate, 'ua_denied', started);
  }

  const ogGate = applyOgDocGate(request);
  if (ogGate) {
    return finishAccessLog(request, ogGate, 'og_denied', started);
  }

  const gate = applyCubeSsoGate(request);
  if (gate) {
    const ssoOutcome = ssoOutcomeFromStatus(gate.status);
    if (ssoOutcome === 'pass') {
      // 鉴权已通过：文档/API 等按 ACCESS 记；/mcp 由 route handler 记 [MCP]
      if (request.nextUrl.pathname === '/mcp') {
        return gate;
      }
      return finishAccessLog(request, gate, 'forward', started);
    }
    return finishSsoLog(request, gate, ssoOutcome, started);
  }

  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) {
    return finishAccessLog(
      request,
      NextResponse.rewrite(new URL(result, request.nextUrl)),
      'rewrite',
      started,
    );
  }

  if (isMarkdownPreferred(request)) {
    const rewritten = rewriteDocs(request.nextUrl.pathname);
    if (rewritten) {
      return finishAccessLog(
        request,
        NextResponse.rewrite(new URL(rewritten, request.nextUrl)),
        'rewrite',
        started,
      );
    }
  }

  return finishAccessLog(request, NextResponse.next(), 'forward', started);
}

export const config = {
  matcher: [
    '/og/docs/:path*',
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
