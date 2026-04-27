import { getDocAccessContext } from '@/lib/doc-access';
import { isDocPageAccessible } from '@/lib/docs-site-tools';
import { getLLMText, source } from '@/lib/source';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const access = getDocAccessContext(request);
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  if (!isDocPageAccessible(page, access)) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
