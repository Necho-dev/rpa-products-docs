export type PlatformFaviconEntry = {
  host: string;
  /** 相对 `_shared/` 的路径，如 `favicons/myseller.taobao.com.png` */
  file: string;
  sourceIcon: string;
};

export type PlatformFaviconManifest = {
  generatedAt: string;
  icons: Record<string, PlatformFaviconEntry>;
};
