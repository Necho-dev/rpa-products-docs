'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, ServerIcon } from 'lucide-react';
import { cn } from '@/lib/core/cn';
import { safeWriteClipboard } from '@/lib/ui/code-block-utils';

interface Props {
  mcpUrl: string;
  /** Cursor / Claude 安装展示名（来自 `MCP_DISPLAY_NAME` 或 `NEXT_PUBLIC_SITE_NAME`） */
  mcpDisplayName: string;
  /** 服务端已配置 `DOCS_PRIVATE_ACCESS_TOKEN` 时需携带 Bearer 访问私有文档 */
  privateDocsAccessEnabled: boolean;
  /** Cube SSO 开启时从 /auth/mcp-token 拉取 Bearer */
  cubeSsoEnabled: boolean;
}

type McpTokenResponse = {
  token?: string;
  authorization?: string;
  expiresAt?: number;
  expiresIn?: number;
  resource?: string;
  reused?: boolean;
};

function formatExpiresAt(ts?: number): string | null {
  if (!ts) return null;
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ts * 1000);
}

function parseTokenResponse(data: McpTokenResponse): {
  authorization?: string;
  expiresAt?: number;
} {
  const authorization =
    data.authorization ?? (data.token ? `Bearer ${data.token}` : undefined);
  return { authorization, expiresAt: data.expiresAt };
}

/**
 * Cursor deeplink 格式：
 *   cursor://anysphere.cursor-deeplink/mcp/install?name=NAME&config=BASE64_JSON
 * config 是 JSON.stringify({ url }) 后的 base64，对应 mcp.json 中单个 server 的 transport 配置
 */
function buildCursorDeeplink(mcpUrl: string, displayName: string, bearer?: string): string {
  const entry = bearer
    ? { url: mcpUrl, headers: { Authorization: bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}` } }
    : { url: mcpUrl };
  const config = btoa(JSON.stringify(entry));
  return `cursor://anysphere.cursor-deeplink/mcp/install?${new URLSearchParams({
    name: displayName,
    config,
  })}`;
}

function buildClients(displayName: string, bearer?: string): {
  name: string;
  description: string;
  icon: React.ReactNode;
  getHref: (url: string) => string;
}[] {
  return [
    {
      name: 'Cursor',
      description: '在 Cursor 中直接添加 MCP Server',
      icon: (
        <svg fill="currentColor" role="img" viewBox="0 0 24 24" className="size-5">
          <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
        </svg>
      ),
      getHref: (url) => buildCursorDeeplink(url, displayName, bearer),
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
        `claude://settings/integrations/install?${new URLSearchParams({ name: displayName, url })}`,
    },
  ];
}

function buildConfigJson(
  mcpUrl: string,
  privateDocsAccessEnabled: boolean,
  cubeSsoEnabled: boolean,
  bearer?: string,
): string {
  const needsBearer = privateDocsAccessEnabled || cubeSsoEnabled;
  const authorization = bearer
    ? bearer.startsWith('Bearer ')
      ? bearer
      : `Bearer ${bearer}`
    : cubeSsoEnabled
      ? 'Bearer <登录后点击刷新获取>'
      : 'Bearer <DOCS_PRIVATE_ACCESS_TOKEN 访问令牌>';

  return JSON.stringify(
    {
      mcpServers: {
        docs: needsBearer
          ? { url: mcpUrl, headers: { Authorization: authorization } }
          : { url: mcpUrl },
      },
    },
    null,
    2,
  );
}

export function McpDeeplinkClient({
  mcpUrl,
  mcpDisplayName,
  privateDocsAccessEnabled,
  cubeSsoEnabled,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [bearer, setBearer] = useState<string | undefined>();
  const [expiresAt, setExpiresAt] = useState<number | undefined>();
  const [tokenLoading, setTokenLoading] = useState(cubeSsoEnabled);
  const [tokenError, setTokenError] = useState('');

  async function fetchMcpToken(options: { showLoading?: boolean; force?: boolean } = {}) {
    const { showLoading = true, force = false } = options;
    if (!cubeSsoEnabled) return;
    if (showLoading) setTokenLoading(true);
    setTokenError('');
    try {
      const url = force ? '/auth/mcp-token?force=1' : '/auth/mcp-token';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setTokenError(
          res.status === 401
            ? '请先通过魔方登录文档站，再返回此页获取 MCP Token。'
            : '暂时无法获取 MCP Token，请稍后重试。',
        );
        setBearer(undefined);
        setExpiresAt(undefined);
        return;
      }
      const data = (await res.json()) as McpTokenResponse;
      const parsed = parseTokenResponse(data);
      setBearer(parsed.authorization);
      setExpiresAt(parsed.expiresAt);
    } catch {
      setTokenError('网络错误，无法获取 MCP Token。');
      setBearer(undefined);
      setExpiresAt(undefined);
    } finally {
      if (showLoading) setTokenLoading(false);
    }
  }

  useEffect(() => {
    if (!cubeSsoEnabled) return;

    let active = true;

    void fetch('/auth/mcp-token', { credentials: 'include' })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setTokenError(
            res.status === 401
              ? '请先通过魔方登录文档站，再返回此页获取 MCP Token。'
              : '暂时无法获取 MCP Token，请稍后重试。',
          );
          setBearer(undefined);
          setExpiresAt(undefined);
          return;
        }
        return res.json() as Promise<McpTokenResponse>;
      })
      .then((data) => {
        if (!active || !data) return;
        const parsed = parseTokenResponse(data);
        setBearer(parsed.authorization);
        setExpiresAt(parsed.expiresAt);
      })
      .catch(() => {
        if (!active) return;
        setTokenError('网络错误，无法获取 MCP Token。');
        setBearer(undefined);
        setExpiresAt(undefined);
      })
      .finally(() => {
        if (active) setTokenLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cubeSsoEnabled]);

  const clients = useMemo(
    () => buildClients(mcpDisplayName, bearer),
    [mcpDisplayName, bearer],
  );

  const configJson = useMemo(
    () => buildConfigJson(mcpUrl, privateDocsAccessEnabled, cubeSsoEnabled, bearer),
    [mcpUrl, privateDocsAccessEnabled, cubeSsoEnabled, bearer],
  );

  function handleCopy() {
    void safeWriteClipboard(mcpUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleTokenCopy() {
    if (!bearer) return;
    void safeWriteClipboard(bearer).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }

  function handleConfigCopy() {
    void safeWriteClipboard(configJson).then(() => {
      setConfigCopied(true);
      setTimeout(() => setConfigCopied(false), 2000);
    });
  }

  const showAuthNote = privateDocsAccessEnabled || cubeSsoEnabled;
  const expiresLabel = formatExpiresAt(expiresAt);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
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

        {showAuthNote ? (
          <div
            className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-left"
            role="note"
          >
            <p className="text-sm font-medium text-fd-foreground">
              {cubeSsoEnabled ? 'MCP Bearer Token（必需）' : '私有文档访问令牌（必需）'}
            </p>
            {cubeSsoEnabled ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
                  须先通过魔方登录文档站。同一登录会话在 30 天内复用同一个 Token（由浏览器
                  HttpOnly Cookie 绑定，按用户 + 魔方环境区分）；打开本页时若仍有效则不会重复签发。
                  请复制到本地 mcp.json 的 <code className="font-mono text-[11px]">Authorization</code>。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchMcpToken({ showLoading: true, force: true })}
                    disabled={tokenLoading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-fd-secondary px-2.5 py-1.5 text-xs font-medium text-fd-secondary-foreground hover:bg-fd-accent"
                  >
                    {tokenLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                    {tokenLoading ? '获取中…' : '重新签发 Token'}
                  </button>
                  {bearer && !tokenLoading ? (
                    <span className="text-xs text-green-600 dark:text-green-400">已获取</span>
                  ) : null}
                  {expiresLabel ? (
                    <span className="text-xs text-fd-muted-foreground">有效期至 {expiresLabel}</span>
                  ) : null}
                </div>
                {tokenLoading && !bearer ? (
                  <p className="mt-3 text-xs text-fd-muted-foreground">正在获取 Token…</p>
                ) : null}
                {bearer ? (
                  <div className="mt-3 rounded-md border border-fd-border/80 bg-fd-background/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-fd-foreground">Authorization</p>
                      <button
                        type="button"
                        onClick={handleTokenCopy}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                          tokenCopied
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent',
                        )}
                      >
                        {tokenCopied ? (
                          <CheckIcon className="size-3" />
                        ) : (
                          <CopyIcon className="size-3" />
                        )}
                        {tokenCopied ? '已复制' : '复制 Token'}
                      </button>
                    </div>
                    <code className="block max-h-28 overflow-y-auto break-all rounded-md bg-fd-muted px-2 py-2 font-mono text-[11px] leading-relaxed text-fd-foreground">
                      {bearer}
                    </code>
                    <p className="mt-2 text-[11px] leading-relaxed text-fd-muted-foreground">
                      在 Cursor / Claude 的 MCP 配置中，将上述值填入{' '}
                      <code className="font-mono">headers.Authorization</code>，无需展开下方完整配置。
                    </p>
                  </div>
                ) : null}
                {tokenError ? (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{tokenError}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
                  当前已启用内容访问验证，MCP 请求须携带正确的 Bearer 访问令牌，否则无法列出、搜索或读取已配置私有访问的文档内容或目录。
                </p>
                <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
                  一键安装通常 <strong>不会</strong> 自动写入请求头；安装完成后请在 MCP 配置中为该 MCP 服务添加{' '}
                  <code className="font-mono text-[11px]">Authorization: Bearer {'<访问令牌>'}</code>
                  ，或直接使用下方「手动配置说明」中提供 <code className="font-mono text-[11px]">headers</code> 的示例。
                </p>
              </>
            )}
          </div>
        ) : null}

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
            {privateDocsAccessEnabled && !cubeSsoEnabled ? (
              <p className="mt-3 text-xs text-fd-muted-foreground">
                请自行将 <code className="font-mono text-[11px]">&lt;DOCS_PRIVATE_ACCESS_TOKEN 访问令牌&gt;</code> 替换为正确的访问令牌，只需在首次安装/使用时配置一次即可。
              </p>
            ) : null}
            {cubeSsoEnabled ? (
              <p className="mt-3 text-xs text-fd-muted-foreground">
                Token 过期或需更换时，点击「重新签发 Token」并更新本地 mcp.json；重新从魔方登录也会清除旧
                Token 绑定。
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}
