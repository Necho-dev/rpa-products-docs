import type {
  DataReadyMeta,
  EstimatedDurationMeta,
  MinIntervalMeta,
} from '@/lib/docs/format-schedule-meta';
import type { FolderPathSegment } from '@/lib/docs/source/category-config';
import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';

export type CategoryFilterLayout = 'tabs' | 'stack' | 'flat' | 'table';

export type CategoryFilterPaginationStyle = 'link' | 'button';

export type CategoryFilterPagination = {
  enable: boolean;
  size: number;
  style: CategoryFilterPaginationStyle;
};

export type CategoryFilterItem = {
  href: string;
  title: string;
  description?: string;
  entry?: string;
  badge?: { label: string; color?: string };
  icon?: ModuleIconConfig;
  coverUrl?: string;
  /** 平台主页（category.link / module.link） */
  url?: string;
  folderPath: FolderPathSegment[];
  /** 文档 page.slugs，用于与侧栏同一套排序 */
  slugs?: string[];
  dataReady?: DataReadyMeta;
  estimatedDuration?: EstimatedDurationMeta;
  minInterval?: MinIntervalMeta;
};

export type CategoryFilterFacet = {
  axisTitle: string;
  options: { slug: string; item: string; icon?: ModuleIconConfig; count: number }[];
};
