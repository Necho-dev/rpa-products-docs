import { stat } from 'node:fs/promises';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';
import {
  remarkDirectiveAdmonition,
  remarkMdxFiles,
  remarkMdxMermaid,
  rehypeCodeDefaultOptions,
} from 'fumadocs-core/mdx-plugins';
import { remarkSteps } from 'fumadocs-core/mdx-plugins/remark-steps';
import { remarkMdxJsonSchema } from './src/lib/docs/source/remark-mdx-json-schema';
import { remarkMdxFieldTree } from './src/lib/docs/source/remark-mdx-field-tree';
import { remarkMdxDocBlocks } from './src/lib/docs/source/remark-mdx-doc-blocks';
import { remarkMdxChangelog } from './src/lib/docs/source/remark-mdx-changelog';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { z } from 'zod';
import { codeBlockIconExtensions, codeBlockIconShortcuts } from './src/lib/ui/code-block-icons';
import { shikiDocsThemes } from './src/lib/ui/shiki-docs-themes';

const docBadgeSchema = z.object({
  label: z.string(),
  /** 任意 CSS 颜色，如 `orange`、`#e67e22`、`hsl(...)` */
  color: z.string().optional(),
});

const moduleIconSchema = z.union([
  z.string().min(1),
  z.object({
    comp: z.string().min(1),
    color: z.string().optional(),
  }),
]);

const dataReadyCycleSchema = z
  .string()
  .regex(
    /^(realtime|hourly|daily|weekly\.[1-7]|monthly\.([1-9]|[12]\d|3[01]))$/,
    '格式须为 realtime / hourly / daily / weekly.1-7 / monthly.1-31',
  );

const scheduleIndicatorDescriptionSchema = z.string().optional();

/** 数据就绪：周期 + 时间点 + 可选说明 */
const dataReadySchema = z
  .object({
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, '格式须为 HH:MM:SS')
      .optional(),
    cycle: dataReadyCycleSchema.optional(),
    description: scheduleIndicatorDescriptionSchema,
  })
  .refine((v) => v.time != null || v.cycle != null, 'dataReady 至少须配置 time 或 cycle')
  .optional();

/** 时长类指标：sec / min / hour 至少配一个，多个时取换算后的最大值 */
const durationValueSchema = z
  .object({
    sec: z.coerce.number().int().positive().optional(),
    min: z.coerce.number().int().positive().optional(),
    hour: z.coerce.number().int().positive().optional(),
    description: scheduleIndicatorDescriptionSchema,
  })
  .refine(
    (v) => v.sec != null || v.min != null || v.hour != null,
    '至少须配置 sec / min / hour 之一',
  );

/** 预估执行耗时 + 可选说明 */
const estimatedDurationSchema = durationValueSchema.optional();

/** 最小调度间隔 + 可选说明 */
const minIntervalSchema = durationValueSchema.optional();

/** 页面：不写 `access` 时继承目录 meta；可写 `public` 强制公开 */
const docsPageSchema = pageSchema.extend({
  access: z.enum(['public', 'private']).optional(),
  /**
   * 技术入口标识（如 rpa.conn.*、PyPI 包名、组件 ID 等），仅用于侧栏第二行小字，与站点 URL/文档路径无关。
   * 与 `title`（中文标题）搭配使用，文件路径/slug 仍决定文档 URL。
   */
  entry: z.string().optional(),
  /** 文档描述下方展示的填充胶囊标签 */
  tags: z.array(z.string()).optional(),
  /** 侧栏文档名右侧背景色徽章（与 `entry` 可同时存在） */
  badge: docBadgeSchema.optional(),
  /** ModuleGrid 卡片主标题；未写则用 title */
  moduleTitle: z.string().optional(),
  /** ModuleGrid 卡片图标：`Bot` 或 `{ comp, color? }`；无 color 时为 muted 默认样式 */
  moduleIcon: moduleIconSchema.optional(),
  /** ModuleGrid 卡片平台入口 URL */
  moduleUrl: z.string().url().optional(),
  /** ModuleGrid 分组 bucket key */
  moduleGroup: z.string().optional(),
  /** 覆盖 grid `cover`：单卡强制开/关 cover.png */
  moduleCover: z.boolean().optional(),
  /** 数据就绪（周期 + 时间）；仅 rpa.conn.* 连接器页展示 */
  dataReady: dataReadySchema,
  /** 预估执行耗时；仅 rpa.conn.* 连接器页展示 */
  estimatedDuration: estimatedDurationSchema,
  /** 最小调度间隔；仅 rpa.conn.* 连接器页展示 */
  minInterval: minIntervalSchema,
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
    remarkPlugins: [
      remarkDirective,
      remarkDirectiveAdmonition,
      remarkMdxChangelog,
      remarkSteps,
      remarkMdxJsonSchema,
      remarkMdxFieldTree,
      remarkMdxDocBlocks,
      remarkMdxFiles,
      remarkMdxMermaid,
      remarkMath,
    ],
    // rehypeKatex 必须在语法高亮之前执行，用函数形式前置插入
    rehypePlugins: (v) => [rehypeKatex, ...v],
    rehypeCodeOptions: {
      themes: { ...shikiDocsThemes },
      inline: 'tailing-curly-colon',
      addLanguageClass: true,
      icon: {
        shortcuts: codeBlockIconShortcuts,
        extend: codeBlockIconExtensions,
      },
      // Extend the default parseMetaString (which handles title/tab/lineNumbers)
      // to also inject `data-collapsed` when the `collapsed` keyword is present.
      parseMetaString(meta, node, tree) {
        const base = rehypeCodeDefaultOptions.parseMetaString?.(meta, node, tree) ?? {};
        if (/\bcollapsed\b/.test(meta)) {
          return { ...base, 'data-collapsed': true };
        }
        return base;
      },
    },
  },
  plugins: [lastModifiedPlugin],
});
