'use client';

import { createContext, useContext, type ReactNode } from 'react';

const SiteNameContext = createContext('RPA公共知识库');

export function SiteNameProvider({
  siteName,
  children,
}: {
  siteName: string;
  children: ReactNode;
}) {
  return <SiteNameContext.Provider value={siteName}>{children}</SiteNameContext.Provider>;
}

export function useSiteName(): string {
  return useContext(SiteNameContext);
}
