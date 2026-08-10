import { getDocAccessContext, getDocAccessContextForEmbed } from '@/lib/docs/access/doc-access';
import { isDocPageAccessible } from '@/lib/docs/docs-site-tools';
import { getEmbedMarkdown, getLLMText, source } from '@/lib/docs/source/source';
import { getEmbedRenderMode, verifyCubeEmbedRequest } from '@/lib/auth/cube-embed';
import { inferSiteOrigin } from '@/lib/core/site-origin';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>) {
  // 嵌入通道判定：
  // proxy.ts rewrite 时会同时设置 x-embed-verified-sh（已验签的 sh）以及原始签名头，
  // 这里在 route handler 层做二次 HMAC 验签，防止外部直接请求并伪造 x-embed-verified-sh 头绕过鉴权。
  const claimedSh = req.headers.get('x-embed-verified-sh');
  const hasRenderMode = getEmbedRenderMode(req) !== null;

  let isEmbedRequest = false;
  let embedSh: string | null = null;
  let embedUser: string | null = null;
  let embedCubeOrigin: string | null = null;

  if (claimedSh && hasRenderMode) {
    // 二次验签：重新校验原始 BFF 签名头
    const verified = verifyCubeEmbedRequest(req);
    if (verified && verified.sh === claimedSh) {
      isEmbedRequest = true;
      embedSh = verified.sh;
      embedUser = verified.user;
      embedCubeOrigin = verified.cubeOrigin;
    }
    // 验签失败: 不是合法的嵌入请求, 下面走 getDocAccessContext (Cookie/Bearer 鉴权)
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

  let body: string;
  if (isEmbedRequest) {
    body = await getEmbedMarkdown(page, embedCubeOrigin);
  } else {
    body = await getLLMText(page, { siteOrigin: inferSiteOrigin(req) });
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
