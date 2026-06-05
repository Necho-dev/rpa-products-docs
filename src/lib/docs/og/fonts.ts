import fs from 'node:fs';
import path from 'node:path';

export type OgFontData = {
  inter: Buffer;
  notoSc: Buffer;
  /** Medium 字重，对应文档页 DocsTitle 的 font-semibold (600) */
  notoScSemibold: Buffer;
  jetBrainsMono: Buffer;
};

function loadFontData(): OgFontData {
  const fontsDir = path.join(process.cwd(), 'src/fonts');
  return {
    inter: fs.readFileSync(path.join(fontsDir, 'inter-400-regular.ttf')),
    notoSc: fs.readFileSync(path.join(fontsDir, 'noto-sans-sc-400-regular.ttf')),
    notoScSemibold: fs.readFileSync(path.join(fontsDir, 'noto-sans-sc-600-medium.otf')),
    jetBrainsMono: fs.readFileSync(path.join(fontsDir, 'jetbrains-mono-400-regular.woff')),
  };
}

let cache: OgFontData | null = null;

export function getOgFontData(): OgFontData {
  if (!cache) cache = loadFontData();
  return cache;
}

export function ogImageFonts(fonts: OgFontData) {
  return [
    { name: 'Inter', data: fonts.inter, weight: 400 as const, style: 'normal' as const },
    { name: 'Noto Sans SC', data: fonts.notoSc, weight: 400 as const, style: 'normal' as const },
    { name: 'Noto Sans SC', data: fonts.notoScSemibold, weight: 600 as const, style: 'normal' as const },
    { name: 'JetBrains Mono', data: fonts.jetBrainsMono, weight: 400 as const, style: 'normal' as const },
  ];
}
