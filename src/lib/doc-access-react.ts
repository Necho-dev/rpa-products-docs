import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import {
  getDocAccessContext,
  isPrivateDocAccessConfigured,
  type DocAccessContext,
} from '@/lib/doc-access';

/** 单次请求内去重：同一 RSC 请求中 Page 与 generateMetadata 等可共用一次解析结果 */
export const getDocAccessContextFromRequest = cache(async (): Promise<DocAccessContext> => {
  if (!isPrivateDocAccessConfigured()) {
    return { canAccessPrivate: true };
  }

  const h = await headers();
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
