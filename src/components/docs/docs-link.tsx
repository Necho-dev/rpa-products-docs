'use client';

import { forwardRef, useState, type MouseEvent } from 'react';
import FumadocsLink, { type LinkProps } from 'fumadocs-core/link';
import { LinkActionDialog } from '@/components/docs/link-action-dialog';

function shouldInterceptLink(href: string | undefined): boolean {
  if (!href || href === '#') return false;
  if (href.startsWith('#') && !href.slice(1).includes('/')) return false;
  return true;
}

function isModifiedClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export const DocsLink = forwardRef<HTMLAnchorElement, LinkProps>(function DocsLink(
  { href = '#', onClick, ...props },
  ref,
) {
  const [menuOpen, setMenuOpen] = useState(false);
  const intercept = shouldInterceptLink(href);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (!intercept || e.defaultPrevented || isModifiedClick(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  };

  return (
    <>
      <FumadocsLink ref={ref} href={href} onClick={handleClick} {...props} />
      {intercept ? (
        <LinkActionDialog open={menuOpen} href={href} onClose={() => setMenuOpen(false)} />
      ) : null}
    </>
  );
});

DocsLink.displayName = 'DocsLink';
