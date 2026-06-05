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
