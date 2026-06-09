export function getDocPageTitle(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const h1 = document.querySelector<HTMLElement>('#nd-page h1');
  return h1?.textContent?.trim() || undefined;
}
