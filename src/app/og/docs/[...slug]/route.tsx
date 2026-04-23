import { getDocAccessContext } from '@/lib/doc-access';
import { getEffectiveDocAccess } from '@/lib/docs-access-effective';
import { isDocPageAccessible } from '@/lib/docs-site-tools';
import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { siteName } from '@/lib/shared';
import fs from 'node:fs';
import path from 'node:path';

export const revalidate = false;

/**
 * 本地字体数据，构建时读取一次（module 级别缓存）。
 * Satori（next/og 底层）只支持 TTF/OTF 格式，不支持 woff2。
 * - inter-400-regular.ttf：拉丁字符（英文/数字）
 * - noto-sans-sc-400-regular.ttf：完整简体中文覆盖
 * 两者都从本地 src/fonts/ 读取，构建时无需远程拉取任何字体。
 */
function loadFontData(): { inter: Buffer; notoSc: Buffer } {
  const fontsDir = path.join(process.cwd(), 'src/fonts');
  return {
    inter: fs.readFileSync(path.join(fontsDir, 'inter-400-regular.ttf')),
    notoSc: fs.readFileSync(path.join(fontsDir, 'noto-sans-sc-400-regular.ttf')),
  };
}

let _fontCache: { inter: Buffer; notoSc: Buffer } | null = null;
function getFontData() {
  if (!_fontCache) _fontCache = loadFontData();
  return _fontCache;
}

export async function GET(req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const access = getDocAccessContext(req);
  if (!isDocPageAccessible(page, access)) notFound();

  const { inter, notoSc } = getFontData();

  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site={siteName} />,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: inter, weight: 400, style: 'normal' },
        { name: 'Noto Sans SC', data: notoSc, weight: 400, style: 'normal' },
      ],
    },
  );
}

export function generateStaticParams() {
  const skipPrivateOg = Boolean(process.env.DOCS_PRIVATE_ACCESS_TOKEN?.trim());
  return source
    .getPages()
    .filter((page) => !skipPrivateOg || getEffectiveDocAccess(page) !== 'private')
    .map((page) => ({
      lang: page.locale,
      slug: getPageImage(page).segments,
    }));
}
