'use client';

import { forwardRef, useState, type MouseEvent } from 'react';
import FumadocsLink, { type LinkProps } from 'fumadocs-core/link';
import { LinkActionDialog } from '@/components/docs/link-action-dialog';

function isExternalHref(href: string): boolean {
  return /^\w+:/.test(href) || href.startsWith('//');
}

function isSameOrigin(href: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isExternalHref(href)) return true; // 相对路径 / 绝对路径均视为同源
  try {
    return new URL(href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * 需要弹出操作菜单的链接：所有非纯锚点链接（含同源和外部）。
 * 纯锚点（#section）不拦截。
 */
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
