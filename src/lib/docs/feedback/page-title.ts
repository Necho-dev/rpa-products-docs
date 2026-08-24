export function getDocPageTitle(surface: 'main' | 'peek' = 'main'): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const root =
    surface === 'peek'
      ? document.querySelector<HTMLElement>('[data-doc-peek="true"]')
      : document.querySelector<HTMLElement>('#nd-page');
  return root?.querySelector('h1')?.textContent?.trim() || undefined;
}
