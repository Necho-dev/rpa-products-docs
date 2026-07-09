export type PlatformFaviconEntry = {
  host: string;
  /**
   * 关联的图标名 / 平台包 Code（frontmatter `icon` 或目录名），如 `RPA_QIANNIU`、`TAOBAO`。
   * 同一 host 可对应多个。
   */
  codes: string[];
  /** 相对 `_shared/` 的路径，如 `favicons/myseller.taobao.com.png` */
  file: string;
  sourceIcon: string;
  /**
   * 由 `--add` 手动登记的条目。常规 sync 不会因未扫到 RPA_* 包而删除。
   */
  custom?: boolean;
};

/**
 * icons 的 key 为站点 origin host（不含协议/路径），如 `myseller.taobao.com`。
 */
export type PlatformFaviconManifest = {
  generatedAt: string;
  icons: Record<string, PlatformFaviconEntry>;
};
