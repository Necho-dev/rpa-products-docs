'use client';

import { createContext, useContext, type ReactNode } from 'react';

const AiSearchUiContext = createContext(false);

export function AiSearchUiProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return <AiSearchUiContext value={enabled}>{children}</AiSearchUiContext>;
}

export function useAiSearchUiEnabled(): boolean {
  return useContext(AiSearchUiContext);
}
