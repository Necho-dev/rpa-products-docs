'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { isSentryEnabled } from '@/lib/observability/sentry/env';

/**
 * 把服务端解析的登录身份挂到浏览器 scope。
 * Session Replay / 客户端 Error 默认是 Anonymous User，除非这里 setUser。
 * Cookie 均为 HttpOnly，不能在客户端解析 DOCSESSION。
 */
export function SentryUserContext({
  userId,
  cubeOrigin,
}: {
  userId?: string;
  cubeOrigin?: string;
}) {
  useEffect(() => {
    if (!isSentryEnabled()) return;

    if (userId) {
      Sentry.setUser({ id: userId, username: userId });
    } else {
      Sentry.setUser(null);
    }

    if (cubeOrigin) {
      Sentry.setTag('cube.origin', cubeOrigin);
    }
  }, [userId, cubeOrigin]);

  return null;
}
