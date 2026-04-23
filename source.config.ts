import { stat } from 'node:fs/promises';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { z } from 'zod';
import { shikiDocsThemes } from './src/lib/shiki-docs-themes';

/** 页面：不写 `access` 时继承目录 meta；可写 `public` 强制公开 */
const docsPageSchema = pageSchema.extend({
  access: z.enum(['public', 'private']).optional(),
  /**
   * 技术入口标识（如 rpa.conn.*、PyPI 包名、组件 ID 等），仅用于侧栏第二行小字，与站点 URL/文档路径无关。
   * 与 `title`（中文标题）搭配使用，文件路径/slug 仍决定文档 URL。
   */
  entry: z.string().optional(),
});

/** 目录 meta：`access: private` 时其下所有页面默认私有（除非某页写 `access: public`） */
const docsMetaSchema = metaSchema.extend({
  access: z.enum(['public', 'private']).optional(),
});

// 文档以 .md + YAML frontmatter 为主。
// 侧栏顺序：无 meta 的目录内 = index 优先 + 其余按路径字典序（见 fumadocs-core buildPaths）。
// 仅需固定「整站一级」顺序时保留根目录 content/docs/meta.json；子目录（如各连接器包）不必每加一个页面就写 meta。
// 首页等少数页面可用 .mdx（如 Cards）；需要分隔符等高级侧栏时再为对应目录加 meta.json / meta.yaml。
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docsPageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: docsMetaSchema,
  },
});

/**
 * 文档「最后更新」时间来源：
 * - 默认 `git`：用 `git log`（需本机/CI 可执行 git、且非过浅的 clone，时间更接近真实提交日）
 * - 环境变量 `FUMADOCS_LAST_MODIFIED=fs`：用文件 mtime（Docker slim 无 git、不跑 apt，见 Dockerfile）
 * @see https://fumadocs.dev/docs/mdx/last-modified
 */
const lastModifiedPlugin = lastModified(
  process.env.FUMADOCS_LAST_MODIFIED === 'fs'
    ? {
        versionControl: async (filePath: string) => {
          try {
            return (await stat(filePath)).mtime;
          } catch {
            return null;
          }
        },
      }
    : {},
);

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid, remarkMath],
    // rehypeKatex 必须在语法高亮之前执行，用函数形式前置插入
    rehypePlugins: (v) => [rehypeKatex, ...v],
    rehypeCodeOptions: {
      themes: { ...shikiDocsThemes },
      inline: 'tailing-curly-colon',
      addLanguageClass: true,
    },
  },
  plugins: [lastModifiedPlugin],
});
