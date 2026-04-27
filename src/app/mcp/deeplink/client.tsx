'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon, ExternalLinkIcon, ServerIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { safeWriteClipboard } from '@/lib/code-block-utils';

interface Props {
  mcpUrl: string;
  /** 服务端已配置 `DOCS_PRIVATE_ACCESS_TOKEN` 时需携带 Bearer 访问私有文档 */
  privateDocsAccessEnabled: boolean;
}

const MCP_SERVER_NAME = 'Docs MCP';

/**
 * Cursor deeplink 格式：
 *   cursor://anysphere.cursor-deeplink/mcp/install?name=NAME&config=BASE64_JSON
 * config 是 JSON.stringify({ url }) 后的 base64，对应 mcp.json 中单个 server 的 transport 配置
 */
function buildCursorDeeplink(mcpUrl: string): string {
  const config = btoa(JSON.stringify({ url: mcpUrl }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?${new URLSearchParams({
    name: MCP_SERVER_NAME,
    config,
  })}`;
}

const clients: {
  name: string;
  description: string;
  icon: React.ReactNode;
  getHref: (url: string) => string;
}[] = [
  {
    name: 'Cursor',
    description: '在 Cursor 中直接添加 MCP Server',
    icon: (
      <svg fill="currentColor" role="img" viewBox="0 0 24 24" className="size-5">
        <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
      </svg>
    ),
    getHref: buildCursorDeeplink,
  },
  {
    name: 'Claude',
    description: '在 Claude Desktop 中添加 MCP Server',
    icon: (
      <svg fill="currentColor" role="img" viewBox="0 0 24 24" className="size-5">
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
      </svg>
    ),
    getHref: (url) =>
      `claude://settings/integrations/install?${new URLSearchParams({ name: MCP_SERVER_NAME, url })}`,
  },
];

export function McpDeeplinkClient({ mcpUrl, privateDocsAccessEnabled }: Props) {
  const [copied, setCopied] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);

  function handleCopy() {
    void safeWriteClipboard(mcpUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const configJson = JSON.stringify(
    {
      mcpServers: {
        docs: privateDocsAccessEnabled
          ? { url: mcpUrl, headers: { Authorization: 'Bearer <DOCS_PRIVATE_ACCESS_TOKEN 访问令牌>' } }
          : { url: mcpUrl },
      },
    },
    null,
    2,
  );

  function handleConfigCopy() {
    void safeWriteClipboard(configJson).then(() => {
      setConfigCopied(true);
      setTimeout(() => setConfigCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="mb-4 flex size-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-fd-accent)', color: 'var(--color-fd-primary)' }}
          >
            <ServerIcon className="size-6" />
          </span>
          <h1 className="text-xl font-semibold text-fd-foreground">添加 MCP 服务</h1>
          <p className="mt-2 text-sm text-fd-muted-foreground">
            将本站 MCP 服务添加到你本地的 AI 开发工具（比如 Cursor、Claude Code），即可在 AI 客户端中直接访问和检索文档内容。
          </p>
        </div>

        {privateDocsAccessEnabled ? (
          <div
            className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-left"
            role="note"
          >
            <p className="text-sm font-medium text-fd-foreground">私有文档访问令牌（必需）</p>
            <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
              当前已启用内容访问验证，MCP 请求须携带正确的 Bearer 访问令牌，否则无法列出、搜索或读取已配置私有访问的文档内容或目录。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
              一键安装通常 <strong>不会</strong> 自动写入请求头；安装完成后请在 MCP 配置中为该 MCP 服务添加{' '}
              <code className="font-mono text-[11px]">Authorization: Bearer {'<访问令牌>'}</code>
              ，或直接使用下方「手动配置说明」中提供 <code className="font-mono text-[11px]">headers</code> 的示例。
            </p>
          </div>
        ) : null}

        {/* MCP URL display */}
        <div className="mb-6 rounded-lg border border-fd-border bg-fd-card p-4">
          <p className="mb-2 text-xs font-medium text-fd-muted-foreground">MCP Server URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-fd-muted px-2 py-1.5 font-mono text-xs text-fd-foreground">
              {mcpUrl}
            </code>
            <button
              onClick={handleCopy}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                copied
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
              )}
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Client deeplinks */}
        <div className="flex flex-col gap-2">
          <p className="mb-1 text-xs font-medium text-fd-muted-foreground">一键添加到客户端</p>
          {clients.map(({ name, description, icon, getHref }) => (
            <a
              key={name}
              href={getHref(mcpUrl)}
              className="flex items-center gap-3 rounded-lg border border-fd-border bg-fd-card px-4 py-3 transition-colors hover:border-fd-primary/40 hover:bg-fd-accent"
            >
              <span className="text-fd-muted-foreground">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fd-foreground">{name}</p>
                <p className="text-xs text-fd-muted-foreground">{description}</p>
              </div>
              <ExternalLinkIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
            </a>
          ))}
        </div>

        {/* Manual instructions */}
        <details className="mt-6 rounded-lg border border-fd-border bg-fd-card">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-fd-muted-foreground hover:text-fd-foreground">
            手动配置说明
          </summary>
          <div className="border-t border-fd-border px-4 pb-4 pt-3">
            <p className="mb-2 text-xs text-fd-muted-foreground">
              在客户端 MCP 配置文件中添加以下内容（名称 <code className="font-mono">docs</code>{' '}
              可按需修改）：
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-fd-muted p-3 font-mono text-xs text-fd-foreground">
                {configJson}
              </pre>
              <button
                onClick={handleConfigCopy}
                className={cn(
                  'absolute right-2 top-2 flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors',
                  configCopied
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-fd-background/80 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
                )}
                title={configCopied ? '已复制' : '复制配置'}
              >
                {configCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                {configCopied ? '已复制' : '复制'}
              </button>
            </div>
            {privateDocsAccessEnabled ? (
              <p className="mt-3 text-xs text-fd-muted-foreground">
                请自行将 <code className="font-mono text-[11px]">&lt;DOCS_PRIVATE_ACCESS_TOKEN 访问令牌&gt;</code> 替换为正确的访问令牌，只需在首次安装/使用时配置一次即可。
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}
