import { getSecretByHash, sha256Hex } from '@/lib/auth/cube';
import { signatureWindowMs } from '@/lib/auth/auth-config';
import {
  readEmbedAuthFields,
  resolveCubeOrigin,
  timingSafeStringEqual,
  type CubeEmbedAuthResult,
} from '@/lib/auth/cube-embed';

export type EmbedSignature = {
  sh: string;
  tm: number;
  sg: string;
};

/** 生成 BFF 嵌入 HMAC 签名 (和魔方 / cube-embed 验签对齐) */
export function buildEmbedSignature(
  method: string,
  pathname: string,
  secret: string,
  sh?: string,
  tm?: number,
): EmbedSignature {
  const hash = sh ?? sha256Hex(secret);
  const timestamp = tm ?? Date.now();
  const sg = sha256Hex(
    `${method.toUpperCase()}\n${pathname}\n${timestamp}\n${secret}`,
  );
  return { sh: hash, tm: timestamp, sg };
}

/**
 * 校验请求 HMAC；`pathname` 默认为 `url.pathname` (资源回源须传实际 `/resources/images/...`)
 */
export function verifySignedRequest(
  request: Request,
  pathname?: string,
): CubeEmbedAuthResult | null {
  const { sh, tmRaw, sg } = readEmbedAuthFields(request);
  if (!sh || !tmRaw || !sg) return null;

  const tm = Number.parseInt(tmRaw, 10);
  if (!Number.isFinite(tm)) return null;
  if (Math.abs(Date.now() - tm) > signatureWindowMs()) return null;

  const secret = getSecretByHash(sh);
  if (!secret) return null;

  const path = pathname ?? new URL(request.url).pathname;
  const expected = sha256Hex(
    `${request.method.toUpperCase()}\n${path}\n${tm}\n${secret}`,
  );
  if (!timingSafeStringEqual(expected, sg)) return null;

  const userRaw =
    request.headers.get('x-cube-user')?.trim()
    ?? new URL(request.url).searchParams.get('user')?.trim()
    ?? '';
  return {
    sh,
    user: userRaw || null,
    cubeOrigin: resolveCubeOrigin(request),
  };
}

/** `/resources/images/*` 专用: 验签 PATH 必须为资源 pathname */
export function verifyResourceRequest(request: Request): boolean {
  const path = new URL(request.url).pathname;
  return verifySignedRequest(request, path) !== null;
}
