import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { source } from '@/lib/docs/source/source';
import { docsRoute } from '@/lib/core/shared';
import {
  normalizeQuoteText,
  verifyShareQuoteSignature,
} from '@/lib/docs/selection/quote-sign';
import { NextResponse } from 'next/server';

function pageFromPath(pagePath: string) {
  if (pagePath === docsRoute) return source.getPage([]);
  if (!pagePath.startsWith(`${docsRoute}/`)) return null;
  const slugs = pagePath.slice(`${docsRoute}/`.length).split('/').filter(Boolean);
  return source.getPage(slugs);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pagePath = url.searchParams.get('path');
  const q = url.searchParams.get('q');
  const prefix = url.searchParams.get('p') ?? '';
  const suffix = url.searchParams.get('s') ?? '';
  const sg = url.searchParams.get('sg') ?? '';

  if (!pagePath || !q) {
    return NextResponse.json({ error: 'path and q required' }, { status: 400 });
  }

  const page = pageFromPath(pagePath);
  if (!page) {
    return NextResponse.json({ error: 'page not found' }, { status: 404 });
  }

  const access = await getDocAccessContextFromRequest();
  if (!isDocPageAccessible(page, access)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const exact = normalizeQuoteText(q);
  if (exact.length < 2) {
    return NextResponse.json({ error: 'invalid quote' }, { status: 400 });
  }

  if (!verifyShareQuoteSignature(pagePath, exact, prefix, suffix, sg)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  return NextResponse.json({ exact, prefix, suffix });
}
