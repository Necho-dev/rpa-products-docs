import { visit } from 'unist-util-visit';
import path from 'node:path';
import type { Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { serializeFieldTreeDirectiveContent } from '@/lib/docs/field-tree/parse';
import {
  jsxExpressionAttribute,
  jsxStringAttribute,
} from '@/lib/docs/source/mdx-jsx-ast';
import { aggregateConnectorBadgeStats } from '@/lib/docs/source/connector-badge-stats';
import type { ConnectorBadgeStat } from '@/lib/docs/source/connector-badge-stats';
import {
  collectModuleGridGroupsFromScan,
  formatModuleGridDirectiveWithModules,
  pageSlugFromDocFile,
  scanModuleGridModulesSync,
  scanSiblingMarkdownModulesSync,
} from '@/lib/docs/source/module-grid-fs-scan';
import { parseModuleGridDirectiveYaml } from '@/lib/docs/source/module-group-config';
import {
  buildTocOnlyGroupHeading,
  findPrecedingHeading,
  shouldInjectModuleGridTocHeadings,
} from '@/lib/docs/source/module-grid-toc';

interface ContainerDirectiveNode {
  type: 'containerDirective';
  name: string;
  children: RootContent[];
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
}

const META_PANEL_BUILTIN_LOGIN_TYPES = ['sms', 'email', 'qrcode'] as const;
type MetaPanelBuiltinLoginType = (typeof META_PANEL_BUILTIN_LOGIN_TYPES)[number];

/** 传给 MetaPanel 的已归一化登录方式项 */
export type MetaPanelLoginOption = {
  text: string;
  /** Lucide / platform / shared CODE；无则纯文本标签 */
  icon?: string;
  color?: string;
};

const BUILTIN_LOGIN_OPTION_META: Record<
  MetaPanelBuiltinLoginType,
  { text: string; icon: string }
> = {
  sms: { text: '短信验证码', icon: 'MessageSquareText' },
  email: { text: '邮件验证码', icon: 'MailCheck' },
  qrcode: { text: '扫码登录', icon: 'QrCode' },
};

const builtinLoginTypeSchema = z.enum(META_PANEL_BUILTIN_LOGIN_TYPES);

const loginOptionObjectSchema = z
  .object({
    text: z.string().min(1).optional(),
    type: builtinLoginTypeSchema.optional(),
    icon: z.string().min(1).optional(),
    color: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const hasText = Boolean(value.text?.trim());
    const hasType = value.type != null;

    if (hasText === hasType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'loginOptions 项须且仅须配置 text 或 type 之一',
      });
    }

    if (hasType && (value.icon || value.color)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'type 内置项不可再配 icon / color',
      });
    }
  });

const loginOptionItemSchema = z.union([
  z.string().min(1),
  loginOptionObjectSchema,
]);

/** YAML: 单项、字符串数组或对象数组 */
export const loginOptionsSchema = z
  .union([loginOptionItemSchema, z.array(loginOptionItemSchema)])
  .optional();

function expandBuiltin(type: MetaPanelBuiltinLoginType): MetaPanelLoginOption {
  const meta = BUILTIN_LOGIN_OPTION_META[type];
  return { text: meta.text, icon: meta.icon };
}

function normalizeLoginOptionItem(
  item: z.infer<typeof loginOptionItemSchema>,
): MetaPanelLoginOption | undefined {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (!trimmed) return undefined;
    if (
      (META_PANEL_BUILTIN_LOGIN_TYPES as readonly string[]).includes(trimmed)
    ) {
      return expandBuiltin(trimmed as MetaPanelBuiltinLoginType);
    }
    return { text: trimmed };
  }

  if (item.type) return expandBuiltin(item.type);

  const text = item.text?.trim();
  if (!text) return undefined;
  const icon = item.icon?.trim() || undefined;
  const color = item.color?.trim() || undefined;
  return {
    text,
    ...(icon ? { icon } : {}),
    ...(color ? { color } : {}),
  };
}

/** 将 YAML loginOptions 归一化为 MetaPanel 可渲染列表；空则 undefined */
export function normalizeLoginOptions(
  value: z.infer<typeof loginOptionsSchema>,
): MetaPanelLoginOption[] | undefined {
  if (value == null) return undefined;
  const items = Array.isArray(value) ? value : [value];
  const normalized = items
    .map(normalizeLoginOptionItem)
    .filter((item): item is MetaPanelLoginOption => item != null);
  return normalized.length > 0 ? normalized : undefined;
}

const metaPanelSchema = z.object({
  platform: z.string().min(1),
  platformUrl: z.string().optional(),
  /** 平台图标 CODE(platform / shared / Lucide), 展示在「适用平台」名称旁 */
  icon: z.string().min(1).optional(),
  requireLogin: z.boolean().optional(),
  /**
   * 登录方式（有序标签列表）。
   * - `{ text }`：纯文本
   * - `{ type: sms|email|qrcode }`：内置图标+文案
   * - `{ text, icon, color? }`：自定义图标
   * - 简写字符串：`账号密码` / `sms`
   */
  loginOptions: loginOptionsSchema,
  /** 授权帮助文档链接; 未配置时不展示 */
  authHelpUrl: z.string().optional(),
});

/** 扫描同目录连接器，按任意 badge.label 聚合（无业务枚举） */
function scanConnectorBadgeStats(indexFilePath: string) {
  const modules = scanSiblingMarkdownModulesSync(indexFilePath).filter((m) =>
    Boolean(m.entry?.trim()),
  );
  return aggregateConnectorBadgeStats(modules.map((m) => m.badge));
}

function extractDirectiveInnerText(directive: ContainerDirectiveNode, file: VFile): string {
  const start = directive.position?.start.offset;
  const end = directive.position?.end.offset;
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    typeof file.value === 'string'
  ) {
    const full = file.value.slice(start, end);
    const firstNl = full.indexOf('\n');
    const lastNl = full.lastIndexOf('\n:::');
    const sliced =
      firstNl >= 0
        ? full.slice(firstNl + 1, lastNl >= 0 ? lastNl : full.length)
        : full;
    if (sliced.trim()) return sliced;
  }

  return serializeFieldTreeDirectiveContent(directive.children).trim();
}

function getOriginalDirectiveText(directive: ContainerDirectiveNode, file: VFile): string {
  const start = directive.position?.start.offset;
  const end = directive.position?.end.offset;
  if (
    typeof start === 'number' &&
    typeof end === 'number' &&
    typeof file.value === 'string'
  ) {
    return file.value.slice(start, end);
  }
  return `:::${directive.name}\n:::\n`;
}

function parseDirectiveYaml(innerText: string, directiveName: string, filePath: string): unknown {
  const trimmed = innerText.trim();
  if (!trimmed) return {};

  try {
    const parsed = parseYaml(trimmed);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected YAML mapping');
    }
    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${filePath}: failed to parse :::${directiveName} YAML — ${msg}`);
  }
}

function parseGroupsYaml(data: unknown, filePath: string) {
  return parseModuleGridDirectiveYaml(data, filePath).groups;
}

function buildMetaPanelJsx(
  meta: z.infer<typeof metaPanelSchema>,
  stats?: { connectorTotal: number; connectorBadgeStats: ConnectorBadgeStat[] },
) {
  const attributes: unknown[] = [jsxStringAttribute('platform', meta.platform)];

  if (meta.platformUrl) {
    attributes.push(jsxStringAttribute('platformUrl', meta.platformUrl));
  }

  if (meta.icon?.trim()) {
    attributes.push(jsxStringAttribute('icon', meta.icon.trim()));
  }

  if (meta.requireLogin === false) {
    attributes.push(jsxExpressionAttribute('requireLogin', false));
  }

  const loginOptions = normalizeLoginOptions(meta.loginOptions);
  if (loginOptions) {
    attributes.push(jsxExpressionAttribute('loginOptions', loginOptions));
  }

  if (meta.authHelpUrl?.trim()) {
    attributes.push(jsxStringAttribute('authHelpUrl', meta.authHelpUrl.trim()));
  }

  if (stats) {
    attributes.push(jsxExpressionAttribute('connectorTotal', stats.connectorTotal));
    attributes.push(
      jsxExpressionAttribute('connectorBadgeStats', stats.connectorBadgeStats),
    );
  }

  return {
    type: 'mdxJsxFlowElement',
    name: 'MetaPanel',
    attributes,
    children: [],
  };
}

function resolveDocFilePath(file: VFile, filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;

  const cwd =
    typeof file.cwd === 'string'
      ? file.cwd
      : typeof file.data?.cwd === 'string'
        ? file.data.cwd
        : process.cwd();

  return path.resolve(cwd, filePath);
}

const remarkMdxDocBlocks: Plugin<[], Root> = () => {
  return (tree, file: VFile) => {
    const filePath = file.path || 'unknown';
    const resolvedFilePath = resolveDocFilePath(file, filePath);

    visit(tree, 'containerDirective', (node, idx, parent) => {
      const directive = node as ContainerDirectiveNode;
      if (typeof idx !== 'number' || !parent) return;

      if (directive.name === 'meta-panel') {
        const innerText = extractDirectiveInnerText(directive, file);
        const raw = parseDirectiveYaml(innerText, 'meta-panel', filePath);
        const parsed = metaPanelSchema.safeParse(raw);
        if (!parsed.success) {
          const msg = parsed.error.issues.map((i) => i.message).join('; ');
          throw new Error(`${filePath}: invalid :::meta-panel — ${msg}`);
        }

        const stats =
          filePath !== 'unknown'
            ? scanConnectorBadgeStats(resolvedFilePath)
            : undefined;

        const originalText = getOriginalDirectiveText(directive, file);
        (parent.children as unknown[])[idx] = {
          ...buildMetaPanelJsx(parsed.data, stats),
          data: { _stringify: { text: originalText } },
        };
        return;
      }

      if (directive.name === 'module-grid') {
        const innerText = extractDirectiveInnerText(directive, file);
        const raw = parseDirectiveYaml(innerText, 'module-grid', filePath);
        const { layout, cover, groups } = parseModuleGridDirectiveYaml(raw, filePath);
        const pageSlug = pageSlugFromDocFile(resolvedFilePath);

        if (pageSlug == null) {
          throw new Error(`${filePath}: cannot derive pageSlug for :::module-grid`);
        }

        const originalText = getOriginalDirectiveText(directive, file);
        const precedingHeading = findPrecedingHeading(
          parent.children as RootContent[],
          idx,
        );

        const attributes: unknown[] = [
          jsxExpressionAttribute('pageSlug', pageSlug),
          jsxExpressionAttribute('groups', groups),
          jsxExpressionAttribute('layout', layout),
          jsxExpressionAttribute('cover', cover),
        ];

        let injectedHeadingCount = 0;
        let modulesMarkdownList = '';

        if (filePath !== 'unknown') {
          const modules = scanModuleGridModulesSync(resolvedFilePath);
          const nonEmptyGroups = collectModuleGridGroupsFromScan(
            modules,
            groups,
          ).filter((g) => g.modules.length > 0);
          modulesMarkdownList = formatModuleGridDirectiveWithModules(
            groups,
            nonEmptyGroups,
            layout,
            cover,
          );

          // tabs 需要虚拟分组 TOC; stack 由运行时补全 TOC; flat 不展示分类故不注入
          if (layout === 'tabs' && shouldInjectModuleGridTocHeadings(nonEmptyGroups)) {
            if (!precedingHeading) {
              console.warn(
                `[remarkMdxDocBlocks] ${filePath}: :::module-grid has multiple groups but no preceding heading for TOC anchors`,
              );
            } else {
              attributes.push(
                jsxStringAttribute('sectionAnchorId', precedingHeading.id) as never,
              );

              const tocHeadings = nonEmptyGroups.map((group) =>
                buildTocOnlyGroupHeading(
                  precedingHeading.id,
                  group,
                  precedingHeading.depth,
                ),
              );

              (parent.children as unknown[]).splice(idx, 0, ...tocHeadings);
              injectedHeadingCount = tocHeadings.length;
            }
          }
        }

        const jsxNode = {
          type: 'mdxJsxFlowElement',
          name: 'ModuleGrid',
          attributes,
          children: [],
          data: {
            _stringify: {
              text: modulesMarkdownList || originalText,
            },
          },
        };

        (parent.children as unknown[])[idx + injectedHeadingCount] = jsxNode;
      }
    });
  };
};

export { remarkMdxDocBlocks };
