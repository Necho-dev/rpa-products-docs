import { cookies } from 'next/headers';
import {
  DOCS_CUBE_ORIGIN_COOKIE,
  DOCS_CUBE_USER_COOKIE,
  DOCS_SESSION_COOKIE,
} from '@/lib/auth/cookie-names';
import { parseSessionToken } from '@/lib/auth/session';

function decodeCookieValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || undefined;
  } catch {
    return raw.trim() || undefined;
  }
}

/** 从 HttpOnly Cookie 解析当前访问者（仅服务端）。 */
export async function resolveClientSentryIdentity(): Promise<{
  userId?: string;
  cubeOrigin?: string;
}> {
  const jar = await cookies();
  const accessUser = decodeCookieValue(jar.get(DOCS_CUBE_USER_COOKIE)?.value);
  const cubeOrigin = decodeCookieValue(jar.get(DOCS_CUBE_ORIGIN_COOKIE)?.value);

  if (accessUser) {
    return { userId: accessUser, cubeOrigin };
  }

  const sessionRaw = jar.get(DOCS_SESSION_COOKIE)?.value;
  if (!sessionRaw) return { cubeOrigin };

  let token = sessionRaw;
  try {
    token = decodeURIComponent(sessionRaw);
  } catch {
    /* keep */
  }
  const session = parseSessionToken(token);
  return {
    userId: session?.u || undefined,
    cubeOrigin,
  };
}
