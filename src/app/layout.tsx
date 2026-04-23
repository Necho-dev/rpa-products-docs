import type { Metadata } from 'next';
import Script from 'next/script';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import 'katex/dist/katex.css';
/** 在 Tailwind/typography 与 KaTeX 之后覆盖文档 blockquote，避免层叠被吃掉 */
import './docs-prose-override.css';
import { FD_COLOR_PRESET_DEFAULT, FD_COLOR_PRESET_STORAGE_KEY } from '@/lib/fd-color-preset';
import localFont from 'next/font/local';
import { cn } from '@/lib/cn';
import { DocumentTitleDefault } from '@/components/document-title-default';
import { getPublicSiteUrl, getPublicSiteUrlIfSet, getSiteDescription, siteName } from '@/lib/shared';

/** 拉丁正文（本地 woff2，见 src/fonts） */
const inter = localFont({
  src: '../fonts/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

/** 代码：JetBrains Mono（variable，本地 woff2） */
const jetBrainsMono = localFont({
  src: '../fonts/jetbrains-mono-latin-wght-normal.woff2',
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: '100 900',
});

const fdColorPresetInitScript = `(function(){try{var k=${JSON.stringify(FD_COLOR_PRESET_STORAGE_KEY)};var d=${JSON.stringify(FD_COLOR_PRESET_DEFAULT)};var v=localStorage.getItem(k)||d;if(v==="neutral")document.documentElement.removeAttribute("data-fd-color-preset");else document.documentElement.setAttribute("data-fd-color-preset",v);}catch(e){document.documentElement.setAttribute("data-fd-color-preset",${JSON.stringify(FD_COLOR_PRESET_DEFAULT)});}})();`;

if (process.env.NODE_ENV === 'production' && !getPublicSiteUrlIfSet()) {
  console.warn(
    '[site] NEXT_PUBLIC_SITE_URL is not set. RSS/MCP absolute links and proxy Host inference may be wrong; set it in production.',
  );
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="zh-CN"
      className={cn(inter.variable, jetBrainsMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="fd-color-preset-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: fdColorPresetInitScript }}
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider>
          <DocumentTitleDefault defaultTitle={siteName} />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: getSiteDescription(),
  alternates: {
    types: {
      'application/rss+xml': [
        {
          title: siteName,
          url: `${getPublicSiteUrl()}/rss.xml`,
        },
      ],
    },
  },
};
