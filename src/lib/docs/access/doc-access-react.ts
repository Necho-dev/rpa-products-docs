import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import {
  getDocAccessContext,
  getDocAccessContextForEmbed,
  isPrivateDocAccessConfigured,
  type DocAccessContext,
} from '@/lib/docs/access/doc-access';
import {
  EMBED_VERIFIED_SH_HEADER,
  EMBED_VERIFIED_USER_HEADER,
  verifyCubeEmbedRequest,
} from '@/lib/auth/cube-embed';

/** 单次请求内去重：同一 RSC 请求中 Page 与 generateMetadata 等可共用一次解析结果 */
export const getDocAccessContextFromRequest = cache(async (): Promise<DocAccessContext> => {
  const h = await headers();

  // 嵌入通道（/embed/docs/**）：proxy 验签通过后写入 x-embed-verified-sh，RSC 二次校验
  const claimedSh = h.get(EMBED_VERIFIED_SH_HEADER);
  if (claimedSh) {
    const reqForVerify = new Request('http://localhost/', { headers: h });
    const verified = verifyCubeEmbedRequest(reqForVerify);
    if (verified && verified.sh === claimedSh) {
      return getDocAccessContextForEmbed(verified.sh, verified.user);
    }
    // 验签失败：不回退到 Cookie 通道，直接拒绝（与 llms.htm route 安全模型一致）
    return { canAccessPrivate: false };
  }

  // 原有 Cookie / Bearer 通道
  if (!isPrivateDocAccessConfigured()) {
    return { canAccessPrivate: true };
  }

  const authorization = h.get('authorization');
  const cookieStore = await cookies();
  const allCookies = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ');

  const hdr = new Headers();
  if (authorization) hdr.set('authorization', authorization);
  if (allCookies) hdr.set('cookie', allCookies);

  return getDocAccessContext(new Request('http://localhost', { headers: hdr }));
});
