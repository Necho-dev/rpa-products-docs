import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { docsRoute } from '@/lib/core/shared';
import { docsEntryInSidebarPlugin } from '@/lib/docs/source/docs-entry-in-sidebar-plugin';

/**
 * middleware / 门禁用的轻量 source：不含 docIconsPlugin。
 * 避免 icons → fs(manifest) / lucide 打进 proxy NFT，触发
 * “Encountered unexpected file in NFT list”（整仓被误追踪）。
 *
 * 页面树 meta / getPage / access 判断与完整 source 一致；仅侧栏图标解析缺失。
 */
export const sourceLite = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [docsEntryInSidebarPlugin()],
});
