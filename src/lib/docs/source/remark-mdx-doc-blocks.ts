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

const metaPanelSchema = z.object({
  platform: z.string().min(1),
  platformUrl: z.string().optional(),
  requireLogin: z.boolean().optional(),
  /** 授权帮助文档链接；未配置时不展示 */
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

  if (meta.requireLogin === false) {
    attributes.push(jsxExpressionAttribute('requireLogin', false));
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

          if (layout !== 'stack' && shouldInjectModuleGridTocHeadings(nonEmptyGroups)) {
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
