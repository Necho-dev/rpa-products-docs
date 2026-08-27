export type OgBadge = {
  label: string;
  color?: string;
};

export type OgShareBaseProps = {
  siteName: string;
  title: string;
  description?: string;
  badge?: OgBadge;
  entry?: string;
  tags?: string[];
  hostname?: string;
};

export type ExcerptBlock = {
  heading?: string;
  body: string;
};

export type OgSharePosterProps = OgShareBaseProps & {
  pageUrl: string;
  qrDataUrl: string;
  heroImageDataUrl?: string;
  heroImageHeight?: number;
};

import type { ModuleIconConfig } from '@/lib/docs/source/module-icon-config';

/** 卡片封面 cover.png（640×360） */
export type OgCoverProps = {
  heroImageDataUrl?: string;
  tags?: string[];
  groupIcon?: ModuleIconConfig;
};
