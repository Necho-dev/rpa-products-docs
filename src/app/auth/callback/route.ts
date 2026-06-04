import { appendSessionCookie, cubeOriginCookieHeader, safeRedirectPath } from '@/lib/auth/session';
import { signatureWindowMs } from '@/lib/auth/auth-config';
import { aesEcbDecrypt, getSecretByHash, isValidCubeOrigin, sha256Hex, timingSafeHexEqual } from '@/lib/auth/cube';
import { clearMcpTokenCookieHeader } from '@/lib/auth/mcp-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CallbackPayload = {
  userName?: string;
  targetUrl?: string;
  cubeOrigin?: string;
};

export function GET(request: Request) {
  const url = new URL(request.url);
  const ed = url.searchParams.get('ed') ?? '';
  const sh = url.searchParams.get('sh') ?? '';
  const sg = url.searchParams.get('sg') ?? '';
  const tmRaw = url.searchParams.get('tm') ?? '';

  let tm: number;
  try {
    tm = Number.parseInt(tmRaw, 10);
  } catch {
    return new Response('bad tm', { status: 400 });
  }
  if (!Number.isFinite(tm)) {
    return new Response('bad tm', { status: 400 });
  }

  if (Math.abs(Date.now() - tm) > signatureWindowMs()) {
    return new Response('timestamp expired', { status: 401 });
  }

  const secret = getSecretByHash(sh);
  if (!secret) {
    return new Response('unknown secret hash', { status: 401 });
  }

  if (!timingSafeHexEqual(sha256Hex(`${ed}${tm}${secret}`), sg)) {
    return new Response('bad signature', { status: 401 });
  }

  let payload: CallbackPayload;
  try {
    payload = JSON.parse(aesEcbDecrypt(ed, secret)) as CallbackPayload;
  } catch {
    return new Response('bad payload', { status: 401 });
  }

  const target = payload.targetUrl ?? '/';
  if (typeof target !== 'string' || !target.startsWith('/')) {
    return new Response('illegal target', { status: 400 });
  }

  const userName = payload.userName ?? '';
  if (!userName) {
    return new Response('missing user', { status: 401 });
  }

  const headers = new Headers({ Location: safeRedirectPath(target) });
  appendSessionCookie(headers, request, { u: userName, s: sh });
  headers.append('Set-Cookie', clearMcpTokenCookieHeader(request));

  const cubeOrigin = payload.cubeOrigin;
  if (isValidCubeOrigin(cubeOrigin)) {
    headers.append('Set-Cookie', cubeOriginCookieHeader(cubeOrigin, request));
  }

  return new Response(null, { status: 302, headers });
}
