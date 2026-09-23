import { getDocAccessContext, getDocAccessContextForEmbed } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { getEmbedMarkdown, source } from '@/lib/docs/source/source';
import { getEmbedMode, verifyCubeEmbedRequest } from '@/lib/auth/cube-embed';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>) {
  // 嵌入通道判定: proxy rewrite 保留 Query 登录包, 并设置 x-embed-verified-sh。
  // 二次调用 UserCenter API: userInfoByAuth, 防止伪造 x-embed-verified-sh 绕过。
  const claimedSh = req.headers.get('x-embed-verified-sh');
  const hasEmbedMode = getEmbedMode(req) !== null;

  let isEmbedRequest = false;
  let embedSh: string | null = null;
  let embedUser: string | null = null;

  if (claimedSh && hasEmbedMode) {
    const verified = await verifyCubeEmbedRequest(req);
    if (verified && verified.sh === claimedSh) {
      isEmbedRequest = true;
      embedSh = verified.sh;
      embedUser = verified.user;
    }
  }

  const access = isEmbedRequest
    ? getDocAccessContextForEmbed(embedSh!, embedUser)
    : getDocAccessContext(req);

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

  const body = await getEmbedMarkdown(page, { siteOrigin: inferSiteOrigin(req) });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
