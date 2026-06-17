/**
 * 嵌入通道极简 Layout（/embed/docs/**）
 *
 * 对比 /docs/layout.tsx 的区别：
 * - 不显示工具栏（分享、Markdown 复制、MCP、ViewOptions）
 * - 不显示侧栏（sidebar）
 * - 不显示 AI 搜索（AISearch）
 * - 不显示摘录（ExcerptCollectionProvider）
 * - 不显示反馈（DocFeedbackProvider）
 * - 不显示浮动锚点（DocsFloatingAnchors）
 * - 不显示选择器（DocSelectionProvider）
 * - 不显示摘录（ExcerptCollectionProvider）
 * 
 * 只支持通过 proxy rewrite（X-Render-Mode: html 通道）访问，
 * 外部直访被 blockEmbedInternalRoutes 拦截返回 404。
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedDocsLayout({ children }: LayoutProps<'/embed/docs'>) {
  return <>{children}</>;
}
