'use client';

export async function fetchQuotePosterUrl(input: {
  slugs: string[];
  text: string;
  pageUrl: string;
}): Promise<{ posterUrl: string; pageUrl: string }> {
  const res = await fetch('/api/docs/quote-poster-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof (err as { error?: string }).error === 'string'
        ? (err as { error: string }).error
        : '生成分享图失败',
    );
  }

  return res.json() as Promise<{ posterUrl: string; pageUrl: string }>;
}
