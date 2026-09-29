import {
  appendSessionCookie,
  cubeOriginCookieHeader,
  encodeLocationHeader,
  safeRedirectPath,
} from '@/lib/auth/session';
import { signatureWindowMs, userCentreBaseUrl } from '@/lib/auth/auth-config';
import {
  isValidCubeOrigin,
  openLoginPackAes,
  resolveRequestCubeOrigin,
} from '@/lib/auth/cube';
import { clearMcpTokenCookieHeader } from '@/lib/auth/mcp-token';
import { fetchUserInfoByAuth, parseSaasQuery } from '@/lib/auth/user-centre';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CallbackPayload = {
  userName?: string;
  targetUrl?: string;
  cubeOrigin?: string;
};

function rejectRedirectWithEmbed(target: string): boolean {
  try {
    const probe = new URL(target, 'http://localhost');
    return probe.searchParams.has('mode') || probe.searchParams.has('render');
  } catch {
    return true;
  }
}

function landingPath(queryRedirect: string | null, payloadTarget?: string): string {
  const raw = queryRedirect || payloadTarget || '/docs';
  return safeRedirectPath(raw);
}

function successRedirect(
  request: Request,
  target: string,
  user: { u: string; s: string },
  cubeOrigin: string | null,
): Response {
  const headers = new Headers({ Location: encodeLocationHeader(target) });
  appendSessionCookie(headers, request, { u: user.u, s: user.s });
  headers.append('Set-Cookie', clearMcpTokenCookieHeader(request));
  if (cubeOrigin && isValidCubeOrigin(cubeOrigin)) {
    headers.append('Set-Cookie', cubeOriginCookieHeader(cubeOrigin, request));
  }
  return new Response(null, { status: 302, headers });
}

async function tryUserCentre(ed: string, sh: string, sg: string, tm: number, isSaas: boolean) {
  if (!userCentreBaseUrl()) return null;
  return fetchUserInfoByAuth({ ed, sh, sg, tm, isSaas });
}

function tryLocalAes(
  ed: string,
  sh: string,
  sg: string,
  tm: number,
): { user: { u: string; s: string }; payload: CallbackPayload } | { error: Response } {
  const local = openLoginPackAes(ed, sh, sg, tm);
  if (!local.ok) return { error: new Response(local.message, { status: 401 }) };
  return { user: { u: local.userName, s: sh }, payload: local.payload };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ed = url.searchParams.get('ed') ?? '';
  const sh = url.searchParams.get('sh') ?? '';
  const sg = url.searchParams.get('sg') ?? '';
  const tmRaw = url.searchParams.get('tm') ?? '';
  const queryRedirect = url.searchParams.get('redirect');
  const isSaas = parseSaasQuery(url.searchParams.get('saas'));

  const tm = Number.parseInt(tmRaw, 10);
  if (!Number.isFinite(tm)) {
    return new Response('bad tm', { status: 400 });
  }

  if (Math.abs(Date.now() - tm) > signatureWindowMs()) {
    return new Response('timestamp expired', { status: 401 });
  }

  if (!ed || !sh || !sg) {
    return new Response('missing login pack', { status: 400 });
  }

  const ucUser = await tryUserCentre(ed, sh, sg, tm, isSaas);
  if (ucUser) {
    const target = landingPath(queryRedirect);
    if (!target.startsWith('/') || rejectRedirectWithEmbed(target)) {
      return new Response('illegal target', { status: 400 });
    }
    return successRedirect(
      request,
      target,
      { u: ucUser.u, s: ucUser.s },
      ucUser.cubeOrigin ?? resolveRequestCubeOrigin(request),
    );
  }

  const local = tryLocalAes(ed, sh, sg, tm);
  if ('error' in local) return local.error;

  const target = landingPath(queryRedirect, local.payload.targetUrl);
  if (typeof target !== 'string' || !target.startsWith('/')) {
    return new Response('illegal target', { status: 400 });
  }
  if (rejectRedirectWithEmbed(target)) {
    return new Response('illegal target', { status: 400 });
  }

  return successRedirect(
    request,
    target,
    local.user,
    local.payload.cubeOrigin || resolveRequestCubeOrigin(request),
  );
}
