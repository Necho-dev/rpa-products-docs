'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CATEGORY_NAV_QUERY,
  categoryNavHref,
  matchCategoryNavModel,
  resolveCategoryNavSelection,
  type CategoryNavModel,
} from '@/lib/docs/source/category-nav';

type CategoryNavContextValue = {
  model: CategoryNavModel | null;
  selectedKey: string | null;
  inferredKey: string | null;
  setSelectedKey: (key: string | null) => void;
};

const CategoryNavContext = createContext<CategoryNavContextValue | null>(null);

export function CategoryNavProvider({
  models,
  children,
}: {
  models: CategoryNavModel[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const model = useMemo(
    () => matchCategoryNavModel(pathname, models),
    [pathname, models],
  );
  const navQuery = searchParams.get(CATEGORY_NAV_QUERY);
  const selectedKey = model
    ? resolveCategoryNavSelection(pathname, navQuery, model)
    : null;
  const inferredKey = selectedKey;

  const setSelectedKey = useCallback(
    (key: string | null) => {
      if (!model) return;
      const href = categoryNavHref(model, key);
      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      if (current === href) return;
      router.push(href);
    },
    [model, pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({
      model,
      selectedKey,
      inferredKey,
      setSelectedKey,
    }),
    [model, selectedKey, inferredKey, setSelectedKey],
  );

  return (
    <CategoryNavContext.Provider value={value}>
      {children}
    </CategoryNavContext.Provider>
  );
}

export function useCategoryNav(): CategoryNavContextValue {
  return (
    useContext(CategoryNavContext) ?? {
      model: null,
      selectedKey: null,
      inferredKey: null,
      setSelectedKey: () => {},
    }
  );
}
