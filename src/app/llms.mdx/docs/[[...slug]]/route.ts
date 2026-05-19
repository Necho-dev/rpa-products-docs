import { getDocAccessContext } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { getLLMText, source } from '@/lib/docs/source/source';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>) {
  const access = getDocAccessContext(req);
  const { slug } = await params;
  const rawSlug = slug ?? [];
  const last = rawSlug[rawSlug.length - 1];
  // 剥掉末尾 .md 后缀（如 ['connectors', 'foo.md'] → ['connectors', 'foo']）
  // 特殊情况：['index.md'] → [] 对应 index 根页
  const stripped = rawSlug.length > 0 && last?.endsWith('.md')
    ? [...rawSlug.slice(0, -1), last.slice(0, -3)]
    : rawSlug;
  const pageSlug = stripped.length === 1 && stripped[0] === 'index' ? [] : stripped;
  const page = source.getPage(pageSlug);
  if (!page) notFound();
  if (!isDocPageAccessible(page, access)) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
