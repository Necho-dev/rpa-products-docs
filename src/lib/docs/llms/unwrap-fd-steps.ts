/**
 * remark-steps 会把 `### 1. 标题` 收成 `<div className="fd-step">` 并去掉序号。
 * LLM / llms.mdx 导出还原为原始 Markdown 序号标题。
 */

const OPEN_STEPS_RE = /<div\s+className=\{?["']fd-steps["']\}?\s*>/;
const OPEN_STEP_RE = /<div\s+className=\{?["']fd-step["']\}?\s*>/;
const DIV_TOKEN_RE = /<div\b[^>]*>|<\/div>/gi;

function matchingDivClose(source: string, afterOpen: number): number {
  DIV_TOKEN_RE.lastIndex = afterOpen;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = DIV_TOKEN_RE.exec(source))) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return match.index;
    } else {
      depth += 1;
    }
  }
  return -1;
}

function restoreHeadingNumber(stepBody: string, n: number): string {
  return stepBody.replace(/^([ \t]*#{1,6}[ \t]+)(?:\d+\.\s+)?/m, `$1${n}. `);
}

function unwrapStepsBlock(inner: string): string {
  const parts: string[] = [];
  let rest = inner;
  let n = 1;

  while (rest.length > 0) {
    const open = OPEN_STEP_RE.exec(rest);
    OPEN_STEP_RE.lastIndex = 0;
    if (!open || open.index === undefined) {
      const leftover = rest.trim();
      if (leftover) parts.push(leftover);
      break;
    }

    const before = rest.slice(0, open.index).trim();
    if (before) parts.push(before);

    const openEnd = open.index + open[0].length;
    const closeAt = matchingDivClose(rest, openEnd);
    if (closeAt < 0) {
      parts.push(rest.slice(open.index).trim());
      break;
    }

    const body = rest.slice(openEnd, closeAt).replace(/^\n+|\n+$/g, '');
    parts.push(restoreHeadingNumber(body, n).trim());
    n += 1;
    rest = rest.slice(closeAt + '</div>'.length);
  }

  return parts.filter(Boolean).join('\n\n');
}

function unwrapInnermostSteps(markdown: string): string | null {
  let lastOpen = -1;
  let lastLen = 0;
  let searchFrom = 0;
  while (searchFrom < markdown.length) {
    const slice = markdown.slice(searchFrom);
    const match = OPEN_STEPS_RE.exec(slice);
    OPEN_STEPS_RE.lastIndex = 0;
    if (!match) break;
    lastOpen = searchFrom + match.index;
    lastLen = match[0].length;
    searchFrom = lastOpen + lastLen;
  }
  if (lastOpen < 0) return null;

  const innerStart = lastOpen + lastLen;
  const closeAt = matchingDivClose(markdown, innerStart);
  if (closeAt < 0) return null;

  const replaced = unwrapStepsBlock(markdown.slice(innerStart, closeAt));
  return `${markdown.slice(0, lastOpen)}${replaced}${markdown.slice(closeAt + '</div>'.length)}`;
}

function unwrapOutsideCodeFences(markdown: string): string {
  let current = markdown;
  for (let i = 0; i < 32; i += 1) {
    const next = unwrapInnermostSteps(current);
    if (next === null) break;
    current = next;
  }
  return current;
}

/** 去掉 fd-steps / fd-step 包装，并把连续步骤标题还原为 `1. ` `2. `。 */
export function unwrapFdSteps(markdown: string): string {
  const chunks = markdown.split(/(```[\s\S]*?```)/g);
  return chunks
    .map((chunk, index) => (index % 2 === 1 ? chunk : unwrapOutsideCodeFences(chunk)))
    .join('')
    .replace(/\n{3,}/g, '\n\n');
}
