import fs from 'node:fs';
import path from 'node:path';

export type OgFontData = {
  inter: Buffer;
  notoSc: Buffer;
  /** Medium 字重，对应文档页 DocsTitle 的 font-semibold (600) */
  notoScSemibold: Buffer;
  jetBrainsMono: Buffer;
};

function readFont(fileName: string): Buffer {
  const filePath = path.join(process.cwd(), 'src/fonts', fileName);
  return fs.readFileSync(filePath);
}

function loadFontData(): OgFontData {
  return {
    inter: readFont('inter-700-bold.woff'),
    notoSc: readFont('noto-sans-sc-600-medium.otf'),
    notoScSemibold: readFont('noto-sans-sc-600-medium.otf'),
    jetBrainsMono: readFont('jetbrains-mono-400-regular.woff'),
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
    { name: 'Inter', data: fonts.inter, weight: 700 as const, style: 'normal' as const },
    { name: 'Noto Sans SC', data: fonts.notoSc, weight: 400 as const, style: 'normal' as const },
    { name: 'Noto Sans SC', data: fonts.notoScSemibold, weight: 600 as const, style: 'normal' as const },
    { name: 'JetBrains Mono', data: fonts.jetBrainsMono, weight: 400 as const, style: 'normal' as const },
  ];
}
