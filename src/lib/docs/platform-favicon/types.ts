export type PlatformFaviconEntry = {
  host: string;
  /** 相对 `_shared/` 的路径，如 `favicons/myseller.taobao.com.png` */
  file: string;
  sourceIcon: string;
};

/**
 * icons 的 key 为站点 origin host（不含协议/路径），如 `myseller.taobao.com`。
 */
export type PlatformFaviconManifest = {
  generatedAt: string;
  icons: Record<string, PlatformFaviconEntry>;
};
