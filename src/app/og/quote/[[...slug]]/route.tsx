/**
 * 动态 quote 路由: 面向选词分享图
 * 公开 URL 仍为 /og/docs/.../quote.png, 内部自动重定向至此
 */
import { renderQuoteOgImage } from '@/lib/docs/og/render-quote-image';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  return renderQuoteOgImage(req, slug);
}
