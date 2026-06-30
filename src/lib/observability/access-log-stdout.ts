import type { AccessLogEntry, AccessLogOutcome } from '@/lib/observability/access-log';
import type { ObservabilityAuthFields } from '@/lib/observability/observability-auth';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GRAY = '\x1b[90m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';

export type ObservabilityLogChannel = 'access' | 'sso' | 'mcp';

/** stdout 通道标识：[ACCESS] / [SSO] / [MCP] */
export function formatObservabilityChannelTag(
  channel: ObservabilityLogChannel,
  useColors: boolean,
): string {
  const text = `[${channel.toUpperCase()}]`;
  if (!useColors) return text;
  switch (channel) {
    case 'access':
      return `${GRAY}${text}${RESET}`;
    case 'sso':
      return `${BLUE}${BOLD}${text}${RESET}`;
    case 'mcp':
      return `${MAGENTA}${BOLD}${text}${RESET}`;
    default:
      return text;
  }
}

/** HTTP 方法按语义着色，便于在混合日志中快速扫读 */
export function formatHttpMethod(method: string, useColors: boolean): string {
  const upper = method.toUpperCase();
  if (!useColors) return upper;
  let color = GRAY;
  switch (upper) {
    case 'GET':
      color = CYAN;
      break;
    case 'POST':
      color = YELLOW;
      break;
    case 'PUT':
    case 'PATCH':
      color = BLUE;
      break;
    case 'DELETE':
      color = RED;
      break;
    default:
      break;
  }
  return `${color}${BOLD}${upper}${RESET}`;
}

/** MCP rpcMethod + tool：tool 名称单独高亮 */
export function formatMcpMethodLabel(
  rpcMethod: string,
  tool: string | undefined,
  useColors: boolean,
): string {
  if (!tool) {
    return useColors ? `${CYAN}${BOLD}${rpcMethod}${RESET}` : rpcMethod;
  }
  const rpc = useColors ? `${DIM}${rpcMethod}${RESET}` : rpcMethod;
  const toolLabel = useColors ? `${YELLOW}${BOLD}${tool}${RESET}` : tool;
  return `${rpc} ${toolLabel}`;
}

const DENIED_OUTCOMES = new Set<AccessLogOutcome>([
  'embed_denied',
  'embed_block',
  'ua_denied',
  'og_denied',
]);

function trimEnv(key: string, env: NodeJS.ProcessEnv): string | undefined {
  const v = env[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t === '' ? undefined : t;
}

export function shouldUseStdoutColors(options?: {
  env?: NodeJS.ProcessEnv;
  isTTY?: boolean;
}): boolean {
  const env = options?.env ?? process.env;
  if (trimEnv('NO_COLOR', env) !== undefined) return false;
  return options?.isTTY ?? Boolean(process.stdout.isTTY);
}

/** ISO UTC → `2026-06-30 14:49:58.231` */
export function formatAccessLogTime(iso: string): string {
  return iso.replace('T', ' ').replace(/Z$/, '');
}

function statusColor(status: number, useColors: boolean): string {
  if (!useColors) return String(status);
  if (status >= 500) return `${RED}${status}${RESET}`;
  if (status >= 400) return `${YELLOW}${status}${RESET}`;
  if (status >= 300) return `${CYAN}${status}${RESET}`;
  return `${GREEN}${status}${RESET}`;
}

function outcomeColor(outcome: AccessLogOutcome, useColors: boolean): string {
  if (!useColors) return outcome;
  if (DENIED_OUTCOMES.has(outcome)) return `${RED}${outcome}${RESET}`;
  if (outcome === 'forward' || outcome === 'rewrite' || outcome === 'embed_ok') {
    return `${DIM}${outcome}${RESET}`;
  }
  if (outcome === 'prefetch') {
    return useColors ? `${DIM}${CYAN}${outcome}${RESET}` : outcome;
  }
  return outcome;
}

/** IP / UA 等次要字段：比 meta 更淡 */
export function formatSubduedLogMeta(value: string, useColors: boolean): string {
  if (!useColors) return value;
  return `${DIM}${GRAY}${value}${RESET}`;
}

/** 元数据括号组；各 part 可自带 ANSI，分隔符保持弱化灰 */
export function formatLogMetaGroup(parts: string[], useColors: boolean): string {
  if (parts.length === 0) return useColors ? `${GRAY}()${RESET}` : '()';
  if (!useColors) return `(${parts.join(' · ')})`;
  const sep = `${RESET}${GRAY} · ${RESET}`;
  return `${GRAY}(${RESET}${parts.join(sep)}${GRAY})${RESET}`;
}

export function formatLogMetaLabel(value: string, useColors: boolean): string {
  if (!useColors) return value;
  return `${GRAY}${value}${RESET}`;
}

/** stdout：用户名（独立标签 + 高亮） */
export function formatAccessUserStdoutLabel(user: string, useColors: boolean): string {
  if (!useColors) return `user:${user}`;
  return `${GRAY}user:${RESET}${CYAN}${BOLD}${user}${RESET}`;
}

/** stdout：魔方来源（独立标签 + 弱化） */
export function formatAccessOriginStdoutLabel(origin: string, useColors: boolean): string {
  if (!useColors) return `origin:${origin}`;
  return `${GRAY}origin:${RESET}${DIM}${BLUE}${origin}${RESET}`;
}

/** stdout：身份独立括号组 `(user:… · origin:…)`，与 outcome / IP 分组 */
export function formatObservabilityStdoutIdentityGroup(
  auth: Pick<ObservabilityAuthFields, 'accessUser' | 'accessOrigin'>,
  useColors: boolean,
): string | undefined {
  const parts: string[] = [];
  if (auth.accessUser) parts.push(formatAccessUserStdoutLabel(auth.accessUser, useColors));
  if (auth.accessOrigin) parts.push(formatAccessOriginStdoutLabel(auth.accessOrigin, useColors));
  if (parts.length === 0) return undefined;
  return formatLogMetaGroup(parts, useColors);
}

/** @deprecated 使用 formatObservabilityStdoutIdentityGroup */
export function appendObservabilityStdoutIdentity(
  metaParts: string[],
  auth: Pick<ObservabilityAuthFields, 'accessUser' | 'accessOrigin'>,
  useColors: boolean,
): void {
  const group = formatObservabilityStdoutIdentityGroup(auth, useColors);
  if (group) metaParts.push(group);
}

/** 拼接 meta / identity / network 等括号组 */
export function joinObservabilityStdoutSections(sections: (string | undefined)[]): string {
  return sections.filter(Boolean).join(' ');
}

function formatPathWithQuery(entry: AccessLogEntry): string {
  return entry.query ? `${entry.path}?${entry.query}` : entry.path;
}

/**
 * stdout 可读行（生产 / 开发统一），风格接近 Next.js 请求日志：
 * 2026-06-30 14:49:58.231 [ACCESS] GET /docs/foo 200 in 1ms (forward · docs) (user:alice · origin:https://…) (127.0.0.1 · Mozilla/5.0 ...)
 */
export function formatAccessLogPretty(
  entry: AccessLogEntry,
  options?: { useColors?: boolean },
): string {
  const useColors = options?.useColors ?? false;
  const time = formatAccessLogTime(entry.time);
  const timeLabel = useColors ? `${GRAY}${time}${RESET}` : time;
  const channel = formatObservabilityChannelTag('access', useColors);
  const path = formatPathWithQuery(entry);
  const method = formatHttpMethod(entry.method, useColors);
  const status = statusColor(entry.status, useColors);
  const duration = useColors ? `${DIM}${entry.durationMs}ms${RESET}` : `${entry.durationMs}ms`;

  const metaParts: string[] = [outcomeColor(entry.outcome, useColors)];
  if (entry.outcome === 'prefetch' && entry.prefetchCount != null) {
    metaParts.push(formatLogMetaLabel(`${entry.prefetchCount} urls`, useColors));
  }
  metaParts.push(formatLogMetaLabel(entry.category, useColors));

  const networkParts: string[] = [];
  if (entry.ip) networkParts.push(formatSubduedLogMeta(entry.ip, useColors));
  if (entry.userAgent) networkParts.push(formatSubduedLogMeta(entry.userAgent, useColors));

  const tail = joinObservabilityStdoutSections([
    formatLogMetaGroup(metaParts, useColors),
    formatObservabilityStdoutIdentityGroup(entry, useColors),
    networkParts.length > 0 ? formatLogMetaGroup(networkParts, useColors) : undefined,
  ]);

  return `${timeLabel} ${channel} ${method} ${path} ${status} in ${duration} ${tail}`;
}

/** stdout 统一 pretty；TTY 下彩色。jsonl 落盘仍用 JSON */
export function formatAccessLogStdout(
  entry: AccessLogEntry,
  options?: { useColors?: boolean },
): string {
  const useColors = options?.useColors ?? shouldUseStdoutColors();
  return formatAccessLogPretty(entry, { ...options, useColors });
}

/** SSO / MCP 等复用：HTTP status 着色 */
export function formatObservabilityStatus(status: number, useColors: boolean): string {
  return statusColor(status, useColors);
}
