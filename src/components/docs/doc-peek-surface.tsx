'use client';

import { createContext, use, type ReactNode } from 'react';

export type DocPeekSurface = 'main' | 'peek';

const DocPeekSurfaceContext = createContext<DocPeekSurface>('main');

export function useDocPeekSurface(): DocPeekSurface {
  return use(DocPeekSurfaceContext);
}

export function DocPeekSurfaceProvider({
  surface,
  children,
}: {
  surface: DocPeekSurface;
  children: ReactNode;
}) {
  return <DocPeekSurfaceContext.Provider value={surface}>{children}</DocPeekSurfaceContext.Provider>;
}
