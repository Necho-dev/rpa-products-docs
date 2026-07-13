/**
 * 全局共享自建图标（content/docs/_public/_shared/icons/）的 manifest 类型。
 *
 * 与 platform-favicon 不同：
 * - 这里的图标是人工设计/维护的自建图标（SVG 为主）
 * - key 即 icon name，在 frontmatter `icon:` 中直接引用（如 `icon: MyBrand`）
 * - 不依赖 host / platformUrl，纯粹的 name → file 映射
 */

export type SharedIconEntry = {
  /** 相对 `_shared/` 的路径，如 `icons/MyBrand.svg` */
  file: string;
  /** 可选描述 */
  description?: string;
};

/**
 * shared-icons.json 结构。
 * key 为 icon name（大写字母开头的 UPPER_SNAKE，如 `MyBrand`、`AUTH_WECHAT`）。
 */
export type SharedIconManifest = {
  updatedAt: string;
  icons: Record<string, SharedIconEntry>;
};
