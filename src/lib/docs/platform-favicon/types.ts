/**
 * Platform icons manifest（content/docs/_public/_shared/platform/icons.json）
 * 与 shared-icons.json 结构对齐：key 即 icon CODE（如 `ICO_DEWU`、`ICO_QIANNIU`）。
 */
export type PlatformIconEntry = {
  /** 相对 `_shared/` 的路径，如 `platform/files/ICO_DEWU.png` */
  file: string;
  /** 图标源 URL（CLI refresh 用） */
  sourceIcon?: string;
  /** 平台域名（如 `mms.pinduoduo.com`，不含协议和尾部斜杠） */
  origin?: string;
  /** 可选描述 */
  description?: string;
};

export type PlatformIconManifest = {
  updatedAt: string;
  icons: Record<string, PlatformIconEntry>;
};

/** @deprecated 使用 PlatformIconEntry */
export type PlatformFaviconEntry = PlatformIconEntry;

/** @deprecated 使用 PlatformIconManifest */
export type PlatformFaviconManifest = PlatformIconManifest;
