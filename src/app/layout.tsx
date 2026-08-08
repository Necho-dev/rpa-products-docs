import type { Metadata } from 'next';
import Script from 'next/script';
import { RootProvider } from 'fumadocs-ui/provider/next';
import DocsSearchDialog from '@/components/docs/search/docs-search-dialog';
import { AiSearchUiProvider } from '@/components/docs/search/ai-search-ui-context';
import { SearchTagsProvider } from '@/components/docs/search/search-tags-context';
import { SentryUserContext } from '@/components/observability/sentry-user-context';
import { isAiSearchAvailable } from '@/lib/docs/search/ai-search';
import { getSearchTags } from '@/lib/docs/search/search-tags';
import { resolveClientSentryIdentity } from '@/lib/observability/sentry-client-identity';
import './global.css';
import 'katex/dist/katex.css';
/** 在 Tailwind/typography 与 KaTeX 之后覆盖文档 blockquote，避免层叠被吃掉 */
import './docs-prose-override.css';
import { FD_COLOR_PRESET_DEFAULT, FD_COLOR_PRESET_STORAGE_KEY } from '@/lib/ui/fd-color-preset';
import localFont from 'next/font/local';
import { cn } from '@/lib/core/cn';
import { DocumentTitleDefault } from '@/components/docs/document-title-default';
import { getPublicSiteUrl, getPublicSiteUrlIfSet, getSiteDescription, getSiteName } from '@/lib/core/shared';

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

export function generateMetadata(): Metadata {
  const siteName = getSiteName();
  return {
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
}

export default async function Layout({ children }: LayoutProps<'/'>) {
  const siteName = getSiteName();
  const aiSearchUiEnabled = isAiSearchAvailable();
  const searchTags = getSearchTags();
  const sentryIdentity = await resolveClientSentryIdentity();

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
        <SentryUserContext
          userId={sentryIdentity.userId}
          cubeOrigin={sentryIdentity.cubeOrigin}
        />
        <AiSearchUiProvider enabled={aiSearchUiEnabled}>
          <SearchTagsProvider tags={searchTags}>
          <RootProvider
            search={{ SearchDialog: DocsSearchDialog }}
            i18n={{
              locale: 'zh-CN',
              translations: {
                search: '搜索',
                toc: '页面导航',
                lastUpdate: '最后更新于',
              },
            }}
          >
            <DocumentTitleDefault defaultTitle={siteName} />
            {children}
          </RootProvider>
          </SearchTagsProvider>
        </AiSearchUiProvider>
      </body>
    </html>
  );
}
