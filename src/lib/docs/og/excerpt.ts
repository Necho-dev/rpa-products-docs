import type { ExcerptBlock } from '@/lib/docs/og/types';
import { truncateText } from '@/lib/docs/og/truncate';

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s*\[#[^\]]+\]/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .trim();
}

function isSkippableLine(line: string): boolean {
  if (!line) return true;
  if (line.startsWith('|')) return true;
  if (line.startsWith('![')) return true;
  if (line.startsWith('<')) return true;
  if (line.startsWith('import ')) return true;
  if (/^[-*+]\s/.test(line)) return true;
  if (/^\d+\.\s/.test(line)) return true;
  return false;
}

/**
 * 从 processed markdown 提取 2～3 个「小标题 + 段落」摘要块。
 */
export function extractExcerptBlocks(
  processed: string,
  maxBlocks = 3,
  maxChars = 120,
): ExcerptBlock[] {
  const lines = processed.split('\n');
  const blocks: ExcerptBlock[] = [];
  let inCode = false;
  let i = 0;

  while (i < lines.length && blocks.length < maxBlocks) {
    const raw = lines[i];
    const line = raw.trim();

    if (line.startsWith('```')) {
      inCode = !inCode;
      i++;
      continue;
    }
    if (inCode) {
      i++;
      continue;
    }

    const headingMatch = line.match(/^#{2,4}\s+(.+)$/);
    if (headingMatch) {
      const heading = stripInlineMarkdown(headingMatch[1]);
      i++;
      const bodyParts: string[] = [];

      while (i < lines.length && bodyParts.length < 2) {
        const next = lines[i].trim();
        if (next.startsWith('```')) break;
        if (/^#{1,4}\s/.test(next)) break;
        if (isSkippableLine(next)) {
          if (!next) i++;
          else i++;
          continue;
        }
        const cleaned = stripInlineMarkdown(next.startsWith('>') ? next.slice(1).trim() : next);
        if (cleaned) bodyParts.push(cleaned);
        i++;
      }

      const body = truncateText(bodyParts.join(' '), maxChars);
      if (body) blocks.push({ heading, body });
      continue;
    }

    i++;
  }

  return blocks;
}
