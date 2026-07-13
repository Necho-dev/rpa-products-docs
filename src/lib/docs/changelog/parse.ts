import type { ChangelogEntry } from './types';

const DATE_TOKEN_RE = /@(\d{8})\b/;
const VERSION_TOKEN_RE = /@v([\w.]+)\b/;

/**
 * 判断一行是否为条目行：行首为 @，且包含 @YYYYMMDD 日期 token。
 * 避免误匹配正文中的普通 @mention。
 */
function isEntryLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('@') && DATE_TOKEN_RE.test(trimmed);
}

function parseDate(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) throw new Error(`日期格式无效：@${raw}，应为 @YYYYMMDD（如 @20260417）`);
  const [, y, mo, d] = m;
  const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (isNaN(dt.getTime())) {
    throw new Error(`日期不合法：@${raw}`);
  }
  return `${y}-${mo}-${d}`;
}

function parseEntryLine(line: string): Omit<ChangelogEntry, 'body'> {
  let rest = line.trim();

  let date: string | undefined;
  let version: string | undefined;

  const dateMatch = rest.match(DATE_TOKEN_RE);
  if (dateMatch) {
    date = parseDate(dateMatch[1]);
    rest = rest.replace(dateMatch[0], '');
  }

  const versionMatch = rest.match(VERSION_TOKEN_RE);
  if (versionMatch) {
    version = `v${versionMatch[1]}`;
    rest = rest.replace(versionMatch[0], '');
  }

  const title = rest.trim() || undefined;

  if (!date) throw new Error('条目行缺少日期 token（应为 @YYYYMMDD）');

  return { date, ...(version ? { version } : {}), ...(title ? { title } : {}) };
}

/**
 * 解析 :::changelog 指令内部文本，切分为多个 ChangelogEntry。
 *
 * @param text       directive 内文本（去掉首尾 `:::changelog` / `:::` 行）
 * @param filePath   文件路径，用于编译错误提示
 */
export function parseChangelogText(text: string, filePath = '<unknown>'): ChangelogEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: ChangelogEntry[] = [];
  let currentMeta: Omit<ChangelogEntry, 'body'> | null = null;
  const bodyLines: string[] = [];

  function flushEntry() {
    if (!currentMeta) return;
    entries.push({ ...currentMeta, body: bodyLines.join('\n').trim() });
    bodyLines.length = 0;
    currentMeta = null;
  }

  for (const line of lines) {
    if (isEntryLine(line)) {
      flushEntry();
      try {
        currentMeta = parseEntryLine(line);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`${filePath}: :::changelog 解析错误 — ${msg}`);
      }
    } else {
      if (currentMeta !== null) {
        bodyLines.push(line);
      }
    }
  }

  flushEntry();

  if (entries.length === 0) {
    throw new Error(
      `${filePath}: :::changelog 内未找到任何合法条目行（应以 @YYYYMMDD 开头，如 @20260417 标题）`,
    );
  }

  return entries;
}
