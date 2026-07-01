/**
 * OG 图片预生成脚本：在 next build 完成后运行，将 cover / image / poster
 * 三类图片渲染为 PNG 文件写入 .next/cache/og/，运行时直接读磁盘返回。
 *
 * 用法（package.json 中自动调用）：
 *   npx tsx scripts/prerender-og.tsx
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { buildOgCoverProps } from '@/lib/docs/og/build-cover-props';
import { buildOgShareBaseProps, buildOgSharePosterProps } from '@/lib/docs/og/build-props';
import { getOgFontData, ogImageFonts } from '@/lib/docs/og/fonts';
import { estimatePosterHeight, POSTER_WIDTH } from '@/lib/docs/og/poster-height';
import { OgCoverCard, COVER_HEIGHT, COVER_WIDTH } from '@/lib/docs/og/template-cover';
import { OgShareCard } from '@/lib/docs/og/template-card';
import { OgSharePoster } from '@/lib/docs/og/template-poster';
import { source } from '@/lib/docs/source/source';
import { getPublicSiteUrl } from '@/lib/core/shared';

const OUT_DIR = path.join(process.cwd(), '.next/cache/og');

async function renderToBuffer(response: ImageResponse): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

/** 将 slugs 映射为 .next/cache/og/ 下的子路径，根页（slugs=[]）直接放在 OUT_DIR 根。 */
function outPath(slugs: string[], fileName: string): string {
  return slugs.length > 0
    ? path.join(OUT_DIR, ...slugs, fileName)
    : path.join(OUT_DIR, fileName);
}

async function main() {
  const pages = source.getPages();
  const fonts = getOgFontData();
  const origin = getPublicSiteUrl();

  console.log(`[og:prerender] origin=${origin}`);
  console.log(`[og:prerender] out=${OUT_DIR}`);
  console.log(`[og:prerender] pages=${pages.length}`);

  let ok = 0;
  let fail = 0;

  for (const page of pages) {
    const slugs = page.slugs;
    const label = slugs.length > 0 ? slugs.join('/') : '(root)';

    try {
      const dir = slugs.length > 0
        ? path.join(OUT_DIR, ...slugs)
        : OUT_DIR;
      await mkdir(dir, { recursive: true });

      // cover.png — 不依赖 origin
      const coverProps = await buildOgCoverProps(page);
      const coverBuf = await renderToBuffer(
        new ImageResponse(<OgCoverCard {...coverProps} />, {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          fonts: ogImageFonts(fonts),
        }),
      );
      await writeFile(outPath(slugs, 'cover.png'), coverBuf);

      // image.png — 依赖 origin（hostname）
      const imageProps = buildOgShareBaseProps(page, origin);
      const imageBuf = await renderToBuffer(
        new ImageResponse(<OgShareCard {...imageProps} />, {
          width: 1200,
          height: 630,
          fonts: ogImageFonts(fonts),
        }),
      );
      await writeFile(outPath(slugs, 'image.png'), imageBuf);

      // poster.png — 依赖 origin（QR 码 URL + hostname）
      const posterProps = await buildOgSharePosterProps(page, origin);
      const posterHeight = estimatePosterHeight(posterProps);
      const posterBuf = await renderToBuffer(
        new ImageResponse(<OgSharePoster {...posterProps} />, {
          width: POSTER_WIDTH,
          height: posterHeight,
          fonts: ogImageFonts(fonts),
        }),
      );
      await writeFile(outPath(slugs, 'poster.png'), posterBuf);

      ok++;
      if (ok % 10 === 0) {
        process.stdout.write(`[og:prerender] ${ok}/${pages.length} done\r`);
      }
    } catch (err) {
      fail++;
      console.error(`[og:prerender] FAIL ${label}:`, err);
    }
  }

  console.log(`\n[og:prerender] done: ${ok} ok, ${fail} fail, total ${pages.length}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[og:prerender] fatal:', err);
  process.exit(1);
});
