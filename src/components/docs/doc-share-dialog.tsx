'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Share2Icon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/lib/core/cn';
import { SharePosterDialog } from '@/components/docs/share-poster-dialog';
import { useDocPeek } from '@/components/docs/doc-peek-context';
import { resolveDocShareLinks, type DocShareLinks } from '@/lib/docs/doc-peek';

export type DocShareButtonProps = {
  title: string;
  description?: string;
  pageUrl: string;
  posterUrl: string;
  className?: string;
};

export function DocShareButton({
  title,
  description,
  pageUrl,
  posterUrl,
  className,
}: DocShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<DocShareLinks>({ pageUrl, compareUrl: null });
  const peek = useDocPeek();
  const pathname = usePathname() ?? '/';

  const resolveLinks = (): DocShareLinks =>
    resolveDocShareLinks({
      pageUrl,
      leftPath: pathname,
      leftHash: typeof window === 'undefined' ? '' : window.location.hash,
      peekTarget: peek?.target ?? null,
      splitOpen: Boolean(peek?.open),
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLinks(resolveLinks());
          setOpen(true);
        }}
        className={cn(
          buttonVariants({ color: 'secondary', size: 'sm' }),
          'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
          className,
        )}
      >
        <Share2Icon />
        分享
      </button>
      <SharePosterDialog
        open={open}
        onClose={() => setOpen(false)}
        dialogLabel="分享文档"
        title={title}
        description={description}
        pageUrl={links.pageUrl}
        compareUrl={links.compareUrl}
        posterUrl={posterUrl}
        downloadFileName="doc-share-poster.png"
      />
    </>
  );
}
