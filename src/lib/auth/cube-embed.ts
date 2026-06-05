import { timingSafeEqual } from 'node:crypto';
import { getSecretByHash, isValidCubeOrigin, sha256Hex } from '@/lib/auth/cube';
import { signatureWindowMs } from '@/lib/auth/auth-config';

/**
 * 魔方 BFF 嵌入通道（通道 A）签名校验结果。
 * 校验通过时返回 { sh, user, cubeOrigin }, 若失败则返回 NULL
 *
 * 签名算法:
 *   SHA256(METHOD + "\\n" + PATH + "\\n" + TIMESTAMP + "\\n" + APP_SECRET)  hex
 *
 * 来源站身份凭证传递:
 *
 * **HTTP Header (推荐, 用于 S2S 场景)**
 *   X-Cube-Secret-Hash / X-Cube-Timestamp / X-Cube-Signature
 *   X-Render-Mode: markdown | html
 *   X-Cube-User（可选）
 *   X-Cube-Origin (推荐, 用于嵌入 HTML 内图片代理基址)
 *
 * **URL Query (与 SSO callback 同名字段, 可复用现有封装)**
 *   sh / tm / sg
 *   render=markdown | html
 *   user (可选, 对应 X-Cube-User)
 *   cubeOrigin (可选)
 *
 * 注意: 签名中的 PATH 为 url.pathname, 不含 Query 字符串。
 */
export type CubeEmbedAuthResult = {
  sh: string;
  user: string | null;
  /** 验签通过后解析；若缺失则嵌入 HTML 不输出 docsResources 图片 URL */
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

export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/** Header 优先, 缺省时从 URL Query 读取 (Query 键名与 /auth/callback 对齐) */
export function readEmbedField(
  request: Request,
  headerName: string,
  queryKey: string,
): string {
  const fromHeader = request.headers.get(headerName)?.trim();
  if (fromHeader) return fromHeader;
  return new URL(request.url).searchParams.get(queryKey)?.trim() ?? '';
}

/** 读取嵌入验签三要素（不含 cubeOrigin） */
export function readEmbedAuthFields(request: Request): {
  sh: string;
  tmRaw: string;
  sg: string;
} {
  return {
    sh: readEmbedField(request, 'x-cube-secret-hash', 'sh'),
    tmRaw: readEmbedField(request, 'x-cube-timestamp', 'tm'),
    sg: readEmbedField(request, 'x-cube-signature', 'sg'),
  };
}

/**
 * 验签成功后解析魔方 origin（须在 HMAC 已通过之后调用）。
 * 优先级: X-Cube-Origin → Query cubeOrigin → Referer / Origin
 */
export function resolveCubeOrigin(request: Request): string | null {
  const fromExplicit = readEmbedField(request, 'x-cube-origin', 'cubeOrigin');
  if (fromExplicit && isValidCubeOrigin(fromExplicit)) {
    return fromExplicit.replace(/\/$/, '');
  }

  for (const header of ['referer', 'origin'] as const) {
    const raw = request.headers.get(header)?.trim();
    if (!raw) continue;
    try {
      const origin = new URL(raw).origin;
      if (isValidCubeOrigin(origin)) return origin;
    } catch {
      // ignore malformed URL
    }
  }

  return null;
}

/**
 * 校验魔方 BFF 嵌入通道 HMAC 签名。
 * - 成功: 返回 CubeEmbedAuthResult
 * - 失败 (签名错误 / 过期 / 未知 sh / 凭证缺失): 返回 NULL
 *
 * 此函数不依赖请求 Cookie / Session, 可直接用于 S2S 场景
 */
export function verifyCubeEmbedRequest(
  request: Request,
  options?: { pathname?: string },
): CubeEmbedAuthResult | null {
  const { sh, tmRaw, sg } = readEmbedAuthFields(request);
  if (!sh || !tmRaw || !sg) return null;

  const tm = Number.parseInt(tmRaw, 10);
  if (!Number.isFinite(tm)) return null;

  if (Math.abs(Date.now() - tm) > signatureWindowMs()) return null;

  const secret = getSecretByHash(sh);
  if (!secret) return null;

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = options?.pathname ?? url.pathname;
  const expected = sha256Hex(`${method}\n${path}\n${tm}\n${secret}`);

  if (!timingSafeStringEqual(expected, sg)) return null;

  const userRaw = readEmbedField(request, 'x-cube-user', 'user');
  const user = userRaw || null;
  const cubeOrigin = resolveCubeOrigin(request);
  return { sh, user, cubeOrigin };
}

/** 从 proxy 透传的内部头读取 cube origin (route handler 二次验签通过后使用) */
export function readVerifiedCubeOrigin(request: Request): string | null {
  const raw = request.headers.get(EMBED_VERIFIED_CUBE_ORIGIN_HEADER)?.trim();
  if (!raw || !isValidCubeOrigin(raw)) return null;
  return raw.replace(/\/$/, '');
}

/**
 * 判断是否为嵌入 render 请求: markdown | html。
 * 读取顺序: Header `X-Render-Mode` → Query `render` (与 docsAuth 参数一致)。
 * 返回 null 表示走通道 B 浏览器 SSO
 */
export function getEmbedRenderMode(request: Request): 'markdown' | 'html' | null {
  const raw =
    request.headers.get('x-render-mode')?.trim().toLowerCase()
    ?? new URL(request.url).searchParams.get('render')?.trim().toLowerCase();
  if (raw === 'markdown') return 'markdown';
  if (raw === 'html') return 'html';
  return null;
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
