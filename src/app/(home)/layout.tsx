import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { getSiteDescription, getSiteName } from '@/lib/core/shared';
import { baseOptions } from '@/lib/ui/layout.shared';

/** 首页随环境变量更新站点名，避免静态缓存旧标题 */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const siteName = getSiteName();
  return {
    title: siteName,
    description: getSiteDescription(),
  };
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
