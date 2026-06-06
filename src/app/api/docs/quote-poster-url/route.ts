import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { source } from '@/lib/docs/source/source';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import {
  buildPageUrlWithTextFragment,
  buildSignedQuotePosterUrl,
  normalizeQuoteText,
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

  const hdrs = await headers();
  const origin = inferSiteOrigin(
    new Request(`http://${hdrs.get('host') ?? 'localhost'}/`, {
      headers: Object.fromEntries(hdrs.entries()),
    }),
  );

  const normalized = normalizeQuoteText(text);
  const posterUrl = buildSignedQuotePosterUrl(origin, slugs, normalized);
  if (!posterUrl) {
    return NextResponse.json({ error: 'sign failed' }, { status: 500 });
  }

  return NextResponse.json({
    posterUrl,
    pageUrl: buildPageUrlWithTextFragment(pageUrl, normalized),
  });
}
