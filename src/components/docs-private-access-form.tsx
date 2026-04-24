'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Props = {
  /** searchParams 解析失败时的回退跳转路径 */
  fallbackNext: string;
};

export function DocsPrivateAccessForm({ fallbackNext }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextFromQuery = searchParams.get('next');
  const next =
    nextFromQuery && nextFromQuery.startsWith('/') && !nextFromQuery.startsWith('//')
      ? nextFromQuery
      : fallbackNext;

  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const res = await fetch('/api/docs-private-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 400) {
          setError('访问令牌不正确或已失效，请核对后重试；仍无法访问请联系管理员。');
          return;
        }
        if (res.status === 501) {
          setError('当前站点未开放此验证方式，请稍后再试或联系管理员。');
          return;
        }
        const raw =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : '';
        setError(raw || '暂时无法验证，请稍后重试。');
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {/* 隐藏 username 字段：满足浏览器无障碍要求，密码管理器不会错误填充 */}
      <input type="text" name="username" autoComplete="username" aria-hidden="true" className="hidden" readOnly tabIndex={-1} />
      <label className="block text-sm font-medium text-fd-foreground">
        访问令牌
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          autoCorrect="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-lg border border-fd-border bg-fd-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
          placeholder="请填写由管理员或文档团队授权给您的访问令牌"
          disabled={pending}
          aria-describedby="docs-access-hint"
        />
      </label>
      <p id="docs-access-hint" className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
        我们不会在此页面展示或回显您的访问令牌；仅用于本次访问验证。
      </p>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !token.trim()}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground opacity-100 disabled:opacity-50"
      >
        {pending ? '验证中…' : '提交验证'}
      </button>
    </form>
  );
}
