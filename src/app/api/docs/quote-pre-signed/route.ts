/**
 * 选词分享预签名：服务端生成带 HMAC 的 quote 分享图 URL 与分享页 URL。
 * 客户端（selection-provider）在用户选中文本后 POST 调用，避免在前端暴露 DOCS_QUOTE_SIGN_SECRET。
 */
import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { source } from '@/lib/docs/source/source';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import {
  buildSignedQuotePosterUrl,
  buildSignedShareQuotePageUrl,
  normalizeQuoteText,
  quoteSignSecret,
} from '@/lib/docs/selection/quote-sign';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const slugs = (body as { slugs?: unknown }).slugs;
  const text = (body as { text?: unknown }).text;
  const pageUrl = (body as { pageUrl?: unknown }).pageUrl;
  const exactRaw = (body as { exact?: unknown }).exact;
  const prefixRaw = (body as { prefix?: unknown }).prefix;
  const suffixRaw = (body as { suffix?: unknown }).suffix;

  if (!Array.isArray(slugs) || slugs.some((s) => typeof s !== 'string')) {
    return NextResponse.json({ error: 'slugs required' }, { status: 400 });
  }
  if (typeof text !== 'string' || text.trim().length < 2) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (typeof pageUrl !== 'string' || !pageUrl.startsWith('http')) {
    return NextResponse.json({ error: 'pageUrl required' }, { status: 400 });
  }

  const page = source.getPage(slugs);
  if (!page) {
    return NextResponse.json({ error: 'page not found' }, { status: 404 });
  }

  const access = await getDocAccessContextFromRequest();
  if (!isDocPageAccessible(page, access)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!quoteSignSecret()) {
    const message = '当前环境未配置 DOCS_QUOTE_SIGN_SECRET, 无法生成分享图';
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const hdrs = await headers();
  const origin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, {
      headers: Object.fromEntries(hdrs.entries()),
    }),
  );

  const normalized = normalizeQuoteText(text);
  const exact =
    typeof exactRaw === 'string' && exactRaw.trim().length >= 2
      ? normalizeQuoteText(exactRaw)
      : normalized;
  const prefix = typeof prefixRaw === 'string' ? prefixRaw : '';
  const suffix = typeof suffixRaw === 'string' ? suffixRaw : '';
  const posterUrl = buildSignedQuotePosterUrl(origin, slugs, normalized);
  if (!posterUrl) {
    return NextResponse.json({ error: 'sign failed' }, { status: 500 });
  }

  return NextResponse.json({
    posterUrl,
    pageUrl: buildSignedShareQuotePageUrl(pageUrl, exact, prefix, suffix),
  });
}
