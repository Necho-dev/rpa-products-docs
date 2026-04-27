import type { DocAccessContext } from '@/lib/doc-access';
import { isPrivateDocAccessConfigured } from '@/lib/doc-access';
import { getSiteDescription, siteName } from '@/lib/shared';

/** Agent Skill 规范要求：name 字段仅含 lowercase letters、digits、hyphens，≤64 字符 */
function toSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

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
  const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=Docs+MCP&config=${cursorConfig}`;
  const claudeDeeplink = `claude://settings/integrations/install?name=Docs+MCP&url=${encodeURIComponent(mcpUrl)}`;

  const rawSkillName = process.env.NEXT_PUBLIC_SKILL_NAME?.trim() || 'rpa-products-docs';
  const skillName = toSkillName(rawSkillName);
  const description =
    `访问 ${siteName}（RPA Connectors / Components / Apps）文档的元技能。` +
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

## 安装 MCP（强烈推荐）

配合 MCP 服务可通过 \`search-docs\`、\`get-page\` 等工具精准检索，避免不必要的上下文加载。

### 通用配置（所有支持 MCP 的客户端）

在客户端 MCP 配置文件（\`mcp.json\` / \`claude_desktop_config.json\` 等）中添加：

\`\`\`json
${mcpConfigJson}
\`\`\`

### 快捷安装链接（客户端特定）

- **Cursor**：[一键添加到 Cursor](${cursorDeeplink})
- **Claude Desktop**：[一键添加到 Claude](${claudeDeeplink})
- **安装引导页**（含各客户端说明）：\`${origin}/mcp/deeplink\`

---

## Roadmap（有 MCP / 无 MCP 通用）

无论是否安装 MCP，均按以下 4 步访问知识库：

\`\`\`
Step 1: 获取目录  → 了解知识库有哪些页面及路径
Step 2: 定位页面  → 找到与任务相关的具体页面
Step 3: 读取内容  → 加载所需页面全文
Step 4: 回答/执行 → 基于内容完成任务
\`\`\`

---

## 有 MCP：精准检索策略

优先使用 MCP 工具，按以下决策树调用，**避免加载不必要的上下文**：

\`\`\`
用户提问
  ├─ 提到具体页面路径/名称 → get-page-meta（确认存在）→ get-page（取正文）
  ├─ 有关键词/主题         → search-docs（搜索）→ get-page（取正文）
  └─ 需要浏览所有页面      → list-pages（目录）→ get-page-meta → get-page
\`\`\`

**优先级规则**（节省 tokens）：
- 已知路径：跳过 \`list-pages\`，直接 \`get-page-meta\` → \`get-page\`
- 有关键词：用 \`search-docs\` 代替 \`list-pages\`，结果更精准
- \`list-pages\` 仅在需要全局浏览时使用
- **严禁**：有 MCP 时不要 fetch \`/skills/references/full.md\`（全量文本，token 消耗极大）

---

## 无 MCP：渐进式加载策略

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

**Step 3 — 如需多页，重复 Step 2，逐页按需加载**

> ⚠ \`GET ${origin}/skills/references/full.md\` 返回所有页面全文，仅在确实需要全局检索且无其他手段时使用。

---

## References

| 端点 | 内容 | 何时使用 |
|---|---|---|
| \`${origin}/skills/references/index.md\` | 全部页面目录（标题+路径） | Step 1，了解知识库结构 |
| \`${origin}/skills/references/docs/{slug}\` | 单页完整 Markdown 正文 | Step 2，按需加载具体页面 |
| \`${origin}/skills/references/full.md\` | 所有页面全文拼接 | 最后手段，谨慎使用 |
`;
}
