import { getDocAccessContextFromRequest } from '@/lib/docs/access/doc-access-react';
import { getLinkPreview } from '@/lib/docs/link-preview';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path') ?? '';
  const access = await getDocAccessContextFromRequest();
  const result = getLinkPreview(path, access);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    title: result.title,
    description: result.description,
    coverUrl: result.coverUrl,
    url: result.url,
  });
}
