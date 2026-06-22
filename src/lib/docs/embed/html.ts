import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { codeToHtml } from 'shiki';
import { rewriteMarkdownImagesForEmbed } from '@/lib/docs/embed/markdown';
import type { source } from '@/lib/docs/source/source';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type DocPage = (typeof source)['$inferPage'];

// ─── CSS 加载 ────────────────────────────────────────────────────────────────

const PROSE_CSS_PATH = join(process.cwd(), 'src/lib/docs/embed/prose.css');

function loadProseCSS(): string {
  try {
    return readFileSync(PROSE_CSS_PATH, 'utf-8');
  } catch {
    return '';
  }
}

// ─── Markdown → HTML（服务端 remark 管道） ──────────────────────────────────

/**
 * 对 `processed` Markdown 文本进行后处理，将特殊组件降级：
 *
 * - `<Mermaid chart="..." />` → 保留源码的 fallback div（不调 browser API）
 * - `<JsonSchema schema="..." />` → JSON 代码块
 * - `<img alt="..." src="__imgN" />` → 已由 rewriteMarkdownImagesForEmbed 处理
 * - `### 标题 [#anchor]` → 清除 fumadocs 注入的锚点文字
 */
function postProcessMarkdownForHtml(processed: string): string {
  // 清除 fumadocs 在标题后注入的锚点文字（如 `[#目标页面]`）
  let result = processed.replace(/( \[#[^\]]+\])+$/gm, '');

  // Mermaid 降级：<Mermaid chart="..." /> → 源码 fallback
  result = result.replace(
    /<Mermaid\s[^>]*chart="([^"]*)"[^>]*\/>/g,
    (_, chart) => {
      const src = chart
        .replaceAll('\\n', '\n')
        .replace(/^["']|["']$/g, '')
        .trim();
      return `\`\`\`mermaid\n${src}\n\`\`\``;
    },
  );

  // Mermaid 多行属性降级（处理换行形式的 JSX）
  result = result.replace(
    /<Mermaid[\s\S]*?chart=\{?`([\s\S]*?)`\}?[\s\S]*?\/>/g,
    (_, chart) => `\`\`\`mermaid\n${chart.trim()}\n\`\`\``,
  );

  // JsonSchema 降级：<JsonSchema schema="..." /> → JSON 代码块
  result = result.replace(
    /<JsonSchema\s+schema="([^"]*)"[^/]*\/>/g,
    (_, schemaText) => {
      let pretty = schemaText;
      try {
        pretty = JSON.stringify(JSON.parse(schemaText), null, 2);
      } catch {
        // 保持原始文本
      }
      return `\`\`\`json\n${pretty}\n\`\`\``;
    },
  );

  // 移除其他不支持 SSR 的 JSX 组件（MetaPanel, ModuleGrid, ModuleCard 等）
  result = result.replace(
    /<(?:MetaPanel|ModuleGrid|ConnectorMeta|ModuleCard|SearchOpenCard|AIChatOpenCard)[^/]*\/>/g,
    '',
  );
  result = result.replace(/<Cards[^>]*>([\s\S]*?)<\/Cards>/g, '$1');
  result = result.replace(/<Callout[^>]*>([\s\S]*?)<\/Callout>/g, '$1');

  return result;
}

/**
 * 用 Shiki 对 HTML 中的 `<pre><code class="language-xxx">` 块做语法高亮替换。
 * remark-rehype 输出的代码块是标准 `<pre><code class="language-xxx">...</code></pre>` 格式。
 */
async function applyShikiHighlight(html: string): Promise<string> {
  // 匹配 <pre><code class="language-xxx">内容</code></pre>
  const codeBlockRe = /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
  const matches: { full: string; lang: string; code: string }[] = [];

  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(html)) !== null) {
    matches.push({ full: m[0], lang: m[1] ?? 'text', code: m[2] });
  }

  let result = html;
  for (const { full, lang, code } of matches) {
    // HTML 实体反转义（remark 输出中 < > & 已转义）
    const rawCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#x26;/g, '&')
      .replace(/&#x27;/g, "'");

    // 不支持的语言降级为 text
    const supportedLangs = new Set(['json', 'typescript', 'javascript', 'ts', 'js', 'bash', 'sh', 'python', 'py', 'yaml', 'toml', 'sql', 'html', 'css', 'xml', 'markdown', 'md', 'mermaid', 'text']);
    const safeLang = supportedLangs.has(lang) ? lang : 'text';

    try {
      const highlighted = await codeToHtml(rawCode, {
        lang: safeLang,
        theme: 'github-light',
      });
      // codeToHtml 返回完整 <pre>...</pre>，直接替换
      result = result.replace(full, highlighted);
    } catch {
      // 高亮失败保持原样
    }
  }
  return result;
}

async function markdownToHtml(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  const rawHtml = String(file);
  return applyShikiHighlight(rawHtml);
}

// ─── 主导出函数 ──────────────────────────────────────────────────────────────

/**
 * 将文档页渲染为完整 HTML 字符串（用于 X-Render-Mode: html 嵌入通道）。
 *
 * 实现策略（绕开 Next.js App Router 对 react-dom/server 的限制）：
 * - 使用 `getText('processed')` 拿到处理后的 Markdown
 * - 图片 src 重写为绝对 URL（embed/markdown）
 * - 组件降级（Mermaid 源码 fallback，JsonSchema 代码块）
 * - remark → rehype → HTML 字符串，无 React 渲染依赖
 * - 返回完整 `<!DOCTYPE html>...` 文档，无站内 layout
 * - 无 Set-Cookie / 无 iframe sandbox 限制
 */
export async function renderDocPageToHtml(
  page: DocPage,
  cubeOrigin: string | null,
): Promise<string> {
  const [processedText, rawText] = await Promise.all([
    page.data.getText('processed'),
    page.data.getText('raw'),
  ]);

  let markdown = rewriteMarkdownImagesForEmbed(processedText, rawText, page.path, {
    cubeOrigin,
  });

  // 组件降级
  markdown = postProcessMarkdownForHtml(markdown);

  // Markdown → HTML
  let bodyHtml: string;
  try {
    bodyHtml = await markdownToHtml(markdown);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    bodyHtml = `<p style="color:red">渲染失败：${escapeHtml(errMsg)}</p>`;
  }

  // 空表格（只有 <thead> 无 <tbody> 或 tbody 无 <tr>）：注入占位行
  bodyHtml = injectEmptyTablePlaceholders(bodyHtml);

  // 每个表格包一层 wrapper div，实现横向滚动同时保持表格 100% 宽度
  bodyHtml = bodyHtml.replace(/<table>/g, '<div class="fd-table-wrap"><table>');
  bodyHtml = bodyHtml.replace(/<\/table>/g, '</table></div>');

  // 加载 prose CSS
  const css = loadProseCSS();

  // 拼装完整 HTML
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.data.title)}</title>
  <style>${css}</style>
</head>
<body>
  <article class="fd-embed-doc">
    <h1>${escapeHtml(page.data.title)}</h1>
${bodyHtml}
  </article>
</body>
</html>`;
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/**
 * 检测只有 <thead> 没有 <tbody tr> 的空表格，注入一行"暂无数据"占位 <tr>，
 * 避免仅渲染表头而空悬的视觉问题。
 */
function injectEmptyTablePlaceholders(html: string): string {
  // 逐个 <table>...</table> 处理，避免跨表格的误匹配
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (fullMatch, inner) => {
    // 有 <tbody> 且 tbody 中包含 <tr> → 非空表格，不处理
    if (/<tbody>[\s\S]*?<tr/.test(inner)) return fullMatch;
    // 提取 thead 内的 th 数量
    const theadMatch = inner.match(/<thead>([\s\S]*?)<\/thead>/);
    const colCount = theadMatch ? (theadMatch[1].match(/<th/g) ?? []).length : 0;
    const placeholder = colCount > 0
      ? `<td colspan="${colCount}" class="fd-empty-placeholder">暂无数据</td>`
      : '<td class="fd-empty-placeholder">暂无数据</td>';
    const injection = `\n<tbody><tr class="fd-empty-row">${placeholder}</tr></tbody>`;
    // 在 </thead> 之后、</table> 之前插入
    return fullMatch.replace('</thead>\n</table>', `</thead>${injection}\n</table>`);
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

