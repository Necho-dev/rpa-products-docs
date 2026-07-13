'use client';

import { createContext, useContext } from 'react';
import type { SearchTag } from '@/lib/docs/search/search-tags';

const SearchTagsContext = createContext<SearchTag[]>([]);

export function SearchTagsProvider({
  tags,
  children,
}: {
  tags: SearchTag[];
  children: React.ReactNode;
}) {
  return (
    <SearchTagsContext.Provider value={tags}>
      {children}
    </SearchTagsContext.Provider>
  );
}

export function useSearchTags(): SearchTag[] {
  return useContext(SearchTagsContext);
}
