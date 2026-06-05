export function truncateText(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function truncateMiddle(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const head = Math.ceil((maxLen - 1) / 2);
  const tail = Math.floor((maxLen - 1) / 2);
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

const URL_SEGMENT_BREAK_PRIORITY: Record<string, number> = {
  '/': 0,
  '-': 1,
  '.': 2,
};

/** 在 maxLen 之前寻找 URL 分段边界（/、-、.），避免从英文单词中间截断。 */
function findUrlSegmentBreak(text: string, maxLen: number): number {
  if (text.length <= maxLen) return text.length;

  const minPos = Math.floor(maxLen * 0.35);
  let bestPos = -1;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (let i = Math.min(maxLen, text.length - 1); i >= minPos; i--) {
    const ch = text[i];
    const priority = URL_SEGMENT_BREAK_PRIORITY[ch];
    if (priority === undefined) continue;

    const pos = i + 1;
    if (priority < bestPriority || (priority === bestPriority && pos > bestPos)) {
      bestPriority = priority;
      bestPos = pos;
    }
  }

  return bestPos > 0 ? bestPos : maxLen;
}

/** 将 URL 拆成最多两行；换行与省略均优先落在 /、-、. 等分段边界。 */
export function splitUrlForTwoLines(
  url: string,
  maxLineLen = 68,
): { line1: string; line2?: string } {
  const t = url.trim();
  if (t.length <= maxLineLen) return { line1: t };

  const break1 = findUrlSegmentBreak(t, maxLineLen);
  const line1 = t.slice(0, break1);
  let line2 = t.slice(break1);

  if (line2.length > maxLineLen) {
    const break2 = findUrlSegmentBreak(line2, maxLineLen - 1);
    line2 = `${line2.slice(0, break2)}…`;
  }

  return line2 ? { line1, line2 } : { line1 };
}
