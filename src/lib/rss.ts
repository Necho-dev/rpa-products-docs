import { Feed } from 'feed';
import type { DocAccessContext } from '@/lib/doc-access';
import { isDocPageAccessible } from '@/lib/docs-site-tools';
import {
  getPublicDocsUrl,
  getPublicSiteUrl,
  getSiteDescription,
  siteName,
} from '@/lib/shared';
import { source } from '@/lib/source';

export function getRSS(access: DocAccessContext) {
  const baseUrl = getPublicSiteUrl();
  const feedUrl = `${baseUrl}/rss.xml`;
  const year = new Date().getFullYear();

  const feed = new Feed({
    title: siteName,
    description: getSiteDescription(),
    id: feedUrl,
    link: getPublicDocsUrl(),
    feed: feedUrl,
    language: 'zh-CN',

    image: `${baseUrl}/banner.png`,
    favicon: `${baseUrl}/icon.svg`,
    copyright: `All rights reserved ${year}, ${siteName}`,
  });

  const pages = source.getPages().filter((page) => isDocPageAccessible(page, access));
  for (const page of pages) {
    feed.addItem({
      id: `${baseUrl}${page.url}`,
      title: page.data.title,
      description: page.data.description,
      link: `${baseUrl}${page.url}`,
      date: new Date(page.data.lastModified ?? new Date()),

      author: [
        {
          name: siteName,
        },
      ],
    });
  }

  return feed.rss2();
}
