import type { DocAccessContext } from '@/lib/docs/access/doc-access';
import { isPrivateDocAccessConfigured } from '@/lib/docs/access/doc-access';
import { getMcpDisplayName, getMcpServerName } from '@/lib/agent/mcp-config';
import { getSiteDescription, siteName } from '@/lib/core/shared';

/**
 * 生成符合 Agent Skill 规范的 SKILL.md 文本。
 *
 * 规范要求（客户端无关）：
 * - YAML frontmatter: name（≤64字符, lowercase+hyphens）+ description（≤1024字符）
 * - 正文: 纯 Markdown，Agent 读取后遵照执行
 *
 * 支持该规范的客户端均可使用（Cursor、Claude Code、Windsurf、Continue 等）。
 */
export function buildSkillMarkdown(origin: string, access: DocAccessContext): string {
  const mcpUrl = `${origin}/mcp`;
  const privateDocsEnabled = isPrivateDocAccessConfigured();

  // 客户端专属快捷安装链接（作为可选补充，非唯一安装方式）
  const cursorConfig = btoa(JSON.stringify({ url: mcpUrl }));
  const mcpDisplayName = getMcpDisplayName();
  const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(mcpDisplayName)}&config=${cursorConfig}`;
  const claudeDeeplink = `claude://settings/integrations/install?name=${encodeURIComponent(mcpDisplayName)}&url=${encodeURIComponent(mcpUrl)}`;

  const skillName = getMcpServerName();
  const description =
    `访问 ${siteName} (RPA 连接器 / 组件 / 应用) 知识库文档内容的元技能。` +
    `推荐配合 MCP 使用以获得精准检索能力，未安装 MCP 时可通过 references 端点渐进式加载内容。` +
    `当用户询问 RPA 连接器、组件、应用部署、RPA 制品相关问题时触发。`;

  const privateHeaderNote = privateDocsEnabled
    ? `\n> **私有文档**：本站启用了访问验证，所有请求需携带 \`Authorization: Bearer <访问令牌>\` 请求头，否则私有内容将返回 404。`
    : '';

  const mcpConfigJson = privateDocsEnabled
    ? JSON.stringify(
        {
          mcpServers: {
            docs: {
              url: mcpUrl,
              headers: { Authorization: 'Bearer <访问令牌>' },
            },
          },
        },
        null,
        2,
      )
    : JSON.stringify({ mcpServers: { docs: { url: mcpUrl } } }, null, 2);

  return `---
name: ${skillName}
description: "${description.slice(0, 1024)}"
---

# ${siteName} — Agent Skill
${privateHeaderNote}

## 安装 MCP (推荐)

推荐安装 MCP 服务，通过 \`search_docs\`、\`get_docs_content\` 等工具精准检索，以获得更好的检索效果，避免不必要的上下文加载。

### 通用配置（所有支持 MCP 的客户端）

在客户端 MCP 配置文件（\`mcp.json\` / \`claude_desktop_config.json\` 等）中添加：

\`\`\`json
${mcpConfigJson}
\`\`\`

### 快捷安装链接（客户端特定）

- **Cursor**: [一键添加到 Cursor](${cursorDeeplink})
- **Claude Desktop**: [一键添加到 Claude](${claudeDeeplink})
- **安装引导页**（含各客户端说明）：\`${origin}/mcp/deeplink\`

---

## Roadmap (有 MCP / 无 MCP 通用)

无论是否安装 MCP 工具，均按以下 4 步访问知识库：

\`\`\`
Step 1: 获取目录  → 了解知识库有哪些页面及路径
Step 2: 定位页面  → 找到与任务相关的具体页面
Step 3: 读取内容  → 加载所需页面全文
Step 4: 回答/执行 → 基于内容完成任务
\`\`\`

---

## 有 MCP 工具：精准检索策略

优先使用 MCP 工具，按以下决策树调用，**避免加载不必要的上下文**：

\`\`\`
用户提问
  ├─ 提到具体页面路径/名称 -> get_docs_met (读取文档元信息) -> get_docs_content (读取文档正文内容)
  ├─ 已有关键词/主题      -> search_docs (根据关键词搜索文档) -> get_docs_content (读取文档正文内容)
  └─ 需要浏览所有页面     -> list_docs (获取目录) -> get_docs_meta (读取文档元信息) → get_docs_content (读取文档正文内容)
\`\`\`

**优先级规则** ( 更省 Tokens 消耗):
- 已知路径: 跳过 \`list_docs\`，直接 \`get_docs_meta\` → \`get_docs_content\`
- 已知关键词: 用 \`search_docs\` 代替 \`list_docs\`，检索结果更准确
- \`list_docs\` 仅在需要全局浏览时使用 ( 例如: 用户询问 "有哪些页面"、"目录结构" 等全局信息时使用 )
- **严禁**：有 MCP 时不要 fetch \`/skills/references/full.md\` ( 全量文本, Tokens 消耗极大 )

---

## 无 MCP 工具：渐进式加载策略

使用 \`/skills/references/*\` 端点，遵循"按需加载、逐步深入"原则：

**Step 1 — 获取页面目录**

\`\`\`
GET ${origin}/skills/references/index.md
\`\`\`

返回全部页面的标题与路径，用于定位相关页面。

**Step 2 — 按需加载单页**

\`\`\`
GET ${origin}/skills/references/docs/{slug}
\`\`\`

\`slug\` = 文档页面路径去掉 \`/docs/\` 前缀，例如：
- \`/docs/connectors/index\` → slug = \`connectors/index\`
- \`/docs/components/auth\` → slug = \`components/auth\`

**Step 3 — 如需多页，重复 Step 2 逐页按需加载**

> ⚠ \`GET ${origin}/skills/references/full.md\` 返回所有页面全文，仅在确实需要全局检索且无其他手段时使用。

---

## References

| 端点 | 内容 | 何时使用 |
|---|---|---|
| \`${origin}/skills/references/index.md\` | 全部页面目录（标题+路径） | Step 1 -> 了解知识库结构 |
| \`${origin}/skills/references/docs/{slug}\` | 单页完整 Markdown 正文 | Step 2 -> 按需加载具体页面 |
| \`${origin}/skills/references/full.md\` | 所有页面全文拼接 | 最后手段，谨慎使用 |
`;
}
