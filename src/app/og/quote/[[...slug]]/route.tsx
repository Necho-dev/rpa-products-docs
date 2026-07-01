import { renderQuoteOgImage } from '@/lib/docs/og/render-quote-image';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  return renderQuoteOgImage(req, slug);
}
