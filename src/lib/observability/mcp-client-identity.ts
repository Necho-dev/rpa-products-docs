/**
 * 识别 MCP / Agent 客户端族（Cursor / Claude Code / Trae 等）。
 *
 * Streamable HTTP 下多数 POST 只有 tools/call，没有 initialize.clientInfo，
 * 因此除协议层 clientInfo 外，还会用 User-Agent 与可选协议头推断。
 */

export type McpClientIdentity = {
  /** 聚合分桶用短名：cursor / claude-code / trae / … */
  family: string;
  /** 原始 clientInfo.name 或 UA 里抽到的产品名 */
  name?: string;
  version?: string;
  /** 推断来源 */
  source: 'initialize' | 'user_agent' | 'header' | 'unknown';
};

const FAMILY_PATTERNS: Array<{ family: string; test: RegExp }> = [
  { family: 'cursor', test: /cursor/i },
  { family: 'claude-code', test: /claude[-_ ]?code|claude\.ai\s*code|@anthropic-ai\/claude-code/i },
  { family: 'claude', test: /\bclaude\b|anthropic/i },
  { family: 'trae', test: /\btrae\b/i },
  { family: 'windsurf', test: /windsurf|codeium/i },
  { family: 'copilot', test: /copilot|github-copilot/i },
  { family: 'continue', test: /\bcontinue\b/i },
  { family: 'vscode', test: /visual studio code|vscode|vs code/i },
  { family: 'zed', test: /\bzed\b/i },
  { family: 'jetbrains', test: /jetbrains|intellij|webstorm|pycharm/i },
  { family: 'node-sdk', test: /@modelcontextprotocol|mcp-sdk|node-fetch|undici|axios/i },
  { family: 'python-sdk', test: /python-mcp|mcp\/|httpx|aiohttp/i },
];

function matchFamily(text: string | undefined): string | undefined {
  if (!text) return undefined;
  for (const { family, test } of FAMILY_PATTERNS) {
    if (test.test(text)) return family;
  }
  return undefined;
}

/** 从 `Name/1.2.3` 或 `Name 1.2.3` 抽 product + version */
function parseProductToken(text: string): { name?: string; version?: string } {
  const slash = text.match(/^([A-Za-z][\w.+-]{1,40})\/([0-9][\w.+-]{0,20})/);
  if (slash) return { name: slash[1], version: slash[2] };
  const space = text.match(/^([A-Za-z][\w.+-]{1,40})\s+([0-9][\w.+-]{0,20})\b/);
  if (space) return { name: space[1], version: space[2] };
  return { name: text.slice(0, 48) || undefined };
}

/**
 * @param clientName initialize.clientInfo.name
 * @param clientVersion initialize.clientInfo.version
 * @param userAgent HTTP User-Agent
 * @param clientHeader 可选 `x-mcp-client` / `mcp-client` 自定义头
 */
export function resolveMcpClientIdentity(input: {
  clientName?: string;
  clientVersion?: string;
  userAgent?: string;
  clientHeader?: string;
}): McpClientIdentity {
  const name = input.clientName?.trim() || undefined;
  const version = input.clientVersion?.trim() || undefined;

  if (name) {
    return {
      family: matchFamily(name) ?? matchFamily(`${name}/${version ?? ''}`) ?? 'other',
      name,
      version,
      source: 'initialize',
    };
  }

  const header = input.clientHeader?.trim();
  if (header) {
    const parsed = parseProductToken(header);
    return {
      family: matchFamily(header) ?? 'other',
      name: parsed.name,
      version: parsed.version,
      source: 'header',
    };
  }

  const ua = input.userAgent?.trim();
  if (ua) {
    const family = matchFamily(ua);
    if (family) {
      // 优先用 UA 首段作为展示名
      const first = ua.split(/\s+/)[0] ?? ua;
      const parsed = parseProductToken(first);
      return {
        family,
        name: parsed.name ?? family,
        version: parsed.version,
        source: 'user_agent',
      };
    }
    return {
      family: 'unknown',
      name: parseProductToken(ua.split(/\s+/)[0] ?? ua).name,
      source: 'user_agent',
    };
  }

  return { family: 'unknown', source: 'unknown' };
}
