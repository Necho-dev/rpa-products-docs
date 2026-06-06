import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { getGitRepositoryWebUrl, getSiteName } from '@/lib/core/shared';

export function baseOptions(): BaseLayoutProps {
  const repoWebUrl = getGitRepositoryWebUrl();
  const siteName = getSiteName();

  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2.5">
          <Image
            src="/icon.svg"
            alt=""
            width={22}
            height={22}
            unoptimized
            aria-hidden
            className="size-[22px] shrink-0 rounded-full"
          />
          <span>{siteName}</span>
        </span>
      ),
    },
    ...(repoWebUrl ? { githubUrl: repoWebUrl } : {}),
    links: [

    ],
  };
}
