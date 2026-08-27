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
import { remarkSectionDirective } from './src/lib/docs/source/remark-section-directive';
import { referencesSchema } from './src/lib/docs/doc-references-core'; // 图边：仅 path / kind
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

/** 筛选芯片图标：Lucide 名 / ICO_*，或 `{ comp, color? }`（color 仅 Lucide） */
const categoryIconSchema = moduleIconSchema;

const categoryCatalogItemSchema = z.object({
  key: z.string().trim().min(1),
  item: z.string().trim().min(1),
  icon: categoryIconSchema.optional(),
});

const categoryIdentitySchema = z.object({
  slug: z.string().trim().min(1).optional(),
  item: z.string().trim().min(1).optional(),
  icon: categoryIconSchema.optional(),
  link: z.string().trim().min(1).optional(),
});

const categoryAxisSchema = z.object({
  title: z.string().trim().min(1).optional(),
  items: z.array(categoryCatalogItemSchema).optional(),
});

/** 分区根 meta：分类导航。`header` 顶栏第二行；`select` 一级 Tab 下拉。与 :::category-filter 无关。 */
const categoryNavSchema = z.union([z.literal(false), z.enum(['header', 'select'])]);

/**
 * 页面 `category`：本节点在父层筛选项中的身份，或叶子归属 key。
 * - 枢纽 index：`{ slug, icon?, link?, item? }`
 * - 连接器 / 授权页：`category: crowd` 或 `{ slug, icon? }`
 * 筛选行名与词表写在目录 meta.json 的 `categoryAxis`。
 */
const categorySchema = z
  .union([z.string().trim().min(1), categoryIdentitySchema])
  .optional();

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

/**
 * 时长类指标（estimatedDuration / minInterval 共用）：
 * - sec / min / hour 至少配一个，多个时取换算后的最大值
 * - unit 为可选计算单位后缀（如「页」「天」），有值时展示为「1 分钟/页」
 */
const durationValueSchema = z
  .object({
    sec: z.coerce.number().int().positive().optional(),
    min: z.coerce.number().int().positive().optional(),
    hour: z.coerce.number().int().positive().optional(),
    unit: z.string().trim().min(1).max(8).optional(),
    description: scheduleIndicatorDescriptionSchema,
  })
  .refine(
    (v) => v.sec != null || v.min != null || v.hour != null,
    '至少需要配置 sec / min / hour 其中之一',
  );

/** 预估执行耗时 + 可选计算单位 + 可选说明 */
const estimatedDurationSchema = durationValueSchema.optional();

/** 最小调度间隔 + 可选计算单位 + 可选说明 */
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
  /**
   * 目录 index 专用：`false` 时侧栏该层只折叠/展开，不把标题做成链接。
   * 页面本身仍可访问（概览卡片、直链）；面包屑仍可用 folder.index。
   */
  sidebarFolderLink: z.boolean().optional(),
  /**
   * 本节点在父层 category-filter 中的身份，或叶子归属 key。
   * 行名与词表写在目录 meta.json 的 `categoryAxis`。
   * 展示形态（layout / cover / depth）写在 :::category-filter。
   */
  category: categorySchema,
  /** 数据就绪（周期 + 时间）；仅 rpa.conn.* 连接器页展示 */
  dataReady: dataReadySchema,
  /** 预估执行耗时；仅 rpa.conn.* 连接器页展示 */
  estimatedDuration: estimatedDurationSchema,
  /** 最小调度间隔；仅 rpa.conn.* 连接器页展示 */
  minInterval: minIntervalSchema,
  /**
   * 本页引用的其它文档（图边：仅 path + kind）。展示位置与 mode 写在 :::references。
   */
  references: referencesSchema,
});

/** 目录 meta：`access: private` 时其下所有页面默认私有（除非某页写 `access: public`） */
const docsMetaSchema = metaSchema.extend({
  access: z.enum(['public', 'private']).optional(),
  /** 侧边栏 Tab 图标颜色（任意 CSS 颜色值，如 `#3b82f6`、`oklch(...)`）；仅 root: true 的分区目录生效 */
  color: z.string().optional(),
  /**
   * 本层筛选轴（只写 meta）：title 为行名，items 为同目录叶子词表。
   * 本节点在父层中的芯片写在 index.md 的 `category`。
   */
  categoryAxis: categoryAxisSchema.optional(),
  /**
   * 分区根专用：把本层 `categoryAxis.items` 做成导航。
   * `header`：顶栏第二行；`select`：一级 Tab 下拉。只过滤侧栏一级菜单。
   */
  categoryNav: categoryNavSchema.optional(),
});

// 文档以 .md + YAML frontmatter 为主。
// 侧栏顺序：无 meta 的目录内 = index 优先 + 其余按路径字典序（见 fumadocs-core buildPaths）。
// 根目录 content/docs/meta.json 固定整站一级顺序。
// 平台 / 子平台目录的 meta.json 只承担：侧栏 pages 顺序 + categoryAxis 筛选词表。
// 首页等少数页面可用 .mdx；需要分隔符等高级侧栏时再为对应目录加 meta.json / meta.yaml。
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

async function fileMtime(filePath: string): Promise<Date | null> {
  try {
    return (await stat(filePath)).mtime;
  } catch {
    return null;
  }
}

/**
 * 文档「最后更新」时间来源：
 * - 默认: 优先 `git log`；无提交历史时 (如未 commit 的路径迁移) 回退文件 mtime
 * - 环境变量 `FUMADOCS_LAST_MODIFIED=fs`: 仅用文件 mtime (Docker slim 无 git, 见 Dockerfile 注释)
 * @see https://fumadocs.dev/docs/mdx/last-modified
 */
const lastModifiedPlugin = lastModified({
  versionControl: async (filePath: string) => {
    if (process.env.FUMADOCS_LAST_MODIFIED === 'fs') {
      return fileMtime(filePath);
    }

    // 与 fumadocs-mdx 默认 git 策略一致，但未入库路径会得到 null → 回退 mtime
    const { x } = await import('tinyexec');
    const path = await import('node:path');
    const relative = path.relative(process.cwd(), filePath);
    try {
      const out = await x(
        'git',
        ['log', '-1', '--pretty=%ai', relative],
        { nodeOptions: { cwd: process.cwd() } },
      );
      if (out.exitCode === 0) {
        const date = new Date(out.stdout.trim().replace(/^"|"$/g, ''));
        if (!Number.isNaN(date.getTime())) return date;
      }
    } catch {
      // ignore git errors
    }
    return fileMtime(filePath);
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkDirective,
      remarkDirectiveAdmonition,
      remarkSectionDirective,
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
