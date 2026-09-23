import {
  isValidCubeOrigin,
  openLoginPackAes,
  resolveRequestCubeOrigin,
} from '@/lib/auth/cube';
import { signatureWindowMs } from '@/lib/auth/auth-config';
import { fetchUserInfoByAuth, parseSaasQuery } from '@/lib/auth/user-centre';

/**
 * 魔方嵌入通道: 登录包(ed/sh/sg/tm) 和 mode 只从 Query 读取
 * 默认 UserCenter userInfoByAuth, 未配置/服务未就绪/请求失败时回退 secrets.json AES
 *
 *   ?mode=page|llms&ed=&sh=&tm=&sg=&saas=
 *
 * 由 UserCenter 返回, cubeOrigin 优先 UserCenter, 缺省时用请求 Referer / Origin 兜底
 */
export type CubeEmbedAuthResult = {
  sh: string;
  user: string | null;
  cubeOrigin: string | null;
};

/** proxy rewrite 后下游 route 可读的内部头 (仅信任 proxy 写入) */
export const EMBED_VERIFIED_SH_HEADER = 'x-embed-verified-sh';
export const EMBED_VERIFIED_USER_HEADER = 'x-embed-verified-user';
export const EMBED_VERIFIED_CUBE_ORIGIN_HEADER = 'x-embed-cube-origin';

/** 移除客户端可能伪造的内部透传头 (仅 proxy 验签通过后重新写入) */
export function stripClientEmbedVerifiedHeaders(headers: Headers): void {
  headers.delete(EMBED_VERIFIED_SH_HEADER);
  headers.delete(EMBED_VERIFIED_USER_HEADER);
  headers.delete(EMBED_VERIFIED_CUBE_ORIGIN_HEADER);
}

/** 从 URL Query 读取嵌入字段 */
export function readEmbedQuery(request: Request, queryKey: string): string {
  return new URL(request.url).searchParams.get(queryKey)?.trim() ?? '';
}

export type EmbedLoginPack = {
  ed: string;
  sh: string;
  tmRaw: string;
  sg: string;
};

export function readEmbedLoginPack(request: Request): EmbedLoginPack {
  return {
    ed: readEmbedQuery(request, 'ed'),
    sh: readEmbedQuery(request, 'sh'),
    tmRaw: readEmbedQuery(request, 'tm'),
    sg: readEmbedQuery(request, 'sg'),
  };
}

/**
 * 用 UserCenter 校验嵌入登录包
 * 未配置、服务未就绪或校验失败时，回退到用 secrets.json AES 验证和解密登录包
 */
export async function verifyCubeEmbedRequest(request: Request): Promise<CubeEmbedAuthResult | null> {
  const { ed, sh, tmRaw, sg } = readEmbedLoginPack(request);
  if (!ed || !sh || !tmRaw || !sg) return null;

  const tm = Number.parseInt(tmRaw, 10);
  if (!Number.isFinite(tm)) return null;
  if (Math.abs(Date.now() - tm) > signatureWindowMs()) return null;

  const user = await fetchUserInfoByAuth({
    ed,
    sh,
    sg,
    tm,
    isSaas: parseSaasQuery(readEmbedQuery(request, 'saas')),
  });
  if (user) {
    return {
      sh,
      user: user.u,
      cubeOrigin: user.cubeOrigin ?? resolveRequestCubeOrigin(request),
    };
  }

  const local = openLoginPackAes(ed, sh, sg, tm);
  if (!local.ok) return null;
  return {
    sh,
    user: local.userName,
    cubeOrigin: resolveRequestCubeOrigin(request),
  };
}

/** 从 proxy 透传的内部头读取 cube origin (route handler 二次验签通过后使用) */
export function readVerifiedCubeOrigin(request: Request): string | null {
  const raw = request.headers.get(EMBED_VERIFIED_CUBE_ORIGIN_HEADER)?.trim();
  if (!raw || !isValidCubeOrigin(raw)) return null;
  return raw.replace(/\/$/, '');
}

export type EmbedMode = 'page' | 'llms';

/** Query mode: page (React) | llms (/llms.mdx Markdown) */
export function readEmbedModeRaw(request: Request): string {
  return readEmbedQuery(request, 'mode').toLowerCase();
}

/**
 * 嵌入 mode: page (React) | llms (/llms.mdx Markdown)
 * 返回 null 表示未声明嵌入 (走全页 SSO), 非法值见 hasInvalidEmbedMode
 */
export function getEmbedMode(request: Request): EmbedMode | null {
  const raw = readEmbedModeRaw(request);
  if (raw === 'page' || raw === 'llms') return raw;
  return null;
}

/** mode 不属于 page|llms */
export function hasInvalidEmbedMode(request: Request): boolean {
  const raw = readEmbedModeRaw(request);
  return raw.length > 0 && raw !== 'page' && raw !== 'llms';
}

/** 生成 401 嵌入鉴权失败响应 (不 302, 不写 Cookie) */
export function embedUnauthorizedResponse(message: string): Response {
  return Response.json(
    { error: 'unauthorized', message },
    {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
}
