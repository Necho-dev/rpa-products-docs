import { createElement } from 'react';

/** Satori 兼容的 Lucide stroke path（24×24 viewBox）；未知 icon 回退 Package */

const LUCIDE_PATHS: Record<string, string[]> = {
  ShoppingBag: [
    'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z',
    'M3 6h18',
    'M16 10a4 4 0 0 1-8 0',
  ],
  Store: [
    'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7',
    'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8',
    'M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4',
    'M2 7h20',
    'M7 7v1',
    'M17 7v1',
  ],
  Truck: [
    'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2',
    'M15 18H9',
    'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14',
    'M19 18v-5',
    'M19 13h-3.5',
    'M6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    'M18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  ],
  Megaphone: [
    'm3 11 18-5v12L3 14v-3z',
    'M11.6 16.8a3 3 0 1 1-5.8-1.6',
  ],
  Bot: [
    'M12 8V4H8',
    'M16 8V4h4',
    'M12 8a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-8a4 4 0 0 1 4-4Z',
    'M9 14h6',
    'M9 18h6',
  ],
  Wallet: [
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  ],
  Sparkles: [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    'M20 3v4',
    'M22 5h-4',
    'M4 17v2',
    'M5 18H3',
  ],
  BarChart2: [
    'M5 21V9',
    'M12 21V3',
    'M19 21v-6',
  ],
  Activity: [
    'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2',
  ],
  MessageCircle: [
    'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  ],
  Link2: [
    'M9 17H7A5 5 0 0 1 7 7h2',
    'M15 7h2a5 5 0 1 1 0 10h-2',
    'M8 12h8',
  ],
  Coins: [
    'M8 6h10',
    'M6 12h10',
    'M4 18h10',
    'M18 6v12',
  ],
  LayoutGrid: [
    'M3 3h7v7H3z',
    'M14 3h7v7h-7z',
    'M14 14h7v7h-7z',
    'M3 14h7v7H3z',
  ],
  Package: [
    'M16.5 9.4 7.55 4.24',
    'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    'm3.27 6.96 8.73 5.05 8.73-5.05',
    'M12 22V12',
  ],
};

function toPascalCase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed.includes('-')) return trimmed;
  return trimmed
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function resolveLucidePaths(comp: string): string[] {
  const pascal = toPascalCase(comp);
  return LUCIDE_PATHS[pascal] ?? LUCIDE_PATHS.Package!;
}

type OgSvgProps = {
  comp: string;
  color?: string;
  size?: number;
};

/** 供 Satori / ImageResponse 使用的 stroke SVG（无 JSX，避免 .ts/.tsx 解析歧义） */
export function OgLucideSvg({ comp, color = '#64748B', size = 48 }: OgSvgProps) {
  const paths = resolveLucidePaths(comp);
  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    paths.map((d, i) => createElement('path', { key: i, d })),
  );
}
