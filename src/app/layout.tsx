import type { Metadata } from 'next';
import { cookies } from 'next/headers';
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
import {
  FD_COLOR_PRESET_STORAGE_KEY,
  fdColorPresetHtmlAttribute,
  parseFdColorPresetId,
} from '@/lib/ui/fd-color-preset';
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
  const cookieStore = await cookies();
  const colorPreset = parseFdColorPresetId(
    cookieStore.get(FD_COLOR_PRESET_STORAGE_KEY)?.value,
  );
  const colorPresetAttr = fdColorPresetHtmlAttribute(colorPreset);

  return (
    <html
      lang="zh-CN"
      className={cn(inter.variable, jetBrainsMono.variable)}
      data-fd-color-preset={colorPresetAttr}
      suppressHydrationWarning
    >
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
                search: '搜索文档内容…',
                toc: '目录',
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
