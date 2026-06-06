'use client';

import { useState } from 'react';
import { Share2Icon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/lib/core/cn';
import { SharePosterDialog } from '@/components/docs/share-poster-dialog';

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        pageUrl={pageUrl}
        posterUrl={posterUrl}
        downloadFileName="doc-share-poster.png"
      />
    </>
  );
}
