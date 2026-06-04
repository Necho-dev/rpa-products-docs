import { getDocAccessContextForEmbed } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { source } from '@/lib/docs/source/source';
import { renderDocPageToHtml } from '@/lib/docs/embed/html';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { verifyCubeEmbedRequest } from '@/lib/auth/cube-embed';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: RouteContext<'/llms.htm/docs/[[...slug]]'>) {
  // 此路由只由 proxy.ts 嵌入通道 rewrite 调用。
  // 二次验签：重新校验原始 BFF 签名头，防止外部伪造 x-embed-verified-sh 绕过
  // （proxy 已拦截直接访问 /llms.htm/，但纵深防御仍做验签）
  const claimedSh = req.headers.get('x-embed-verified-sh');
  if (!claimedSh) {
    return Response.json(
      { error: 'unauthorized', message: '请通过嵌入鉴权通道访问' },
      { status: 401 },
    );
  }

  const verified = verifyCubeEmbedRequest(req);
  if (!verified || verified.sh !== claimedSh) {
    return Response.json(
      { error: 'unauthorized', message: '来源站身份二次校验失败' },
      { status: 401 },
    );
  }

  const access = getDocAccessContextForEmbed(verified.sh, verified.user);

  const { slug } = await params;
  const rawSlug = slug ?? [];
  const pageSlug = rawSlug.length === 1 && rawSlug[0] === 'index' ? [] : rawSlug;
  const page = source.getPage(pageSlug);
  if (!page) notFound();
  if (!isDocPageAccessible(page, access)) notFound();

  const siteOrigin = inferSiteOrigin(req);
  const html = await renderDocPageToHtml(page, siteOrigin);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
