import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type SearchTag = {
  /** tag 值，等于分区 slug（如 'rpa'、'auth'） */
  value: string;
  /** 展示名称，来自分区 meta.json 的 title */
  label: string;
};

const DOCS_DIR = join(process.cwd(), 'content', 'docs');

type PartitionMeta = { root?: boolean; title?: string };

/**
 * 从 content/docs/ 各子目录的 meta.json 读取分区列表，用于搜索 tag filter。
 * 仅供服务端调用（依赖 Node.js fs 模块）。
 * 客户端通过 SearchTagsContext 获取已序列化的数据。
 *
 * 只读取带有 "root": true 的分区目录。
 * label 来自 meta.json 的 title；value 来自目录名（即 URL slug）。
 */
export function getSearchTags(): SearchTag[] {
  const tags: SearchTag[] = [];

  try {
    const entries = readdirSync(DOCS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      // isDirectory() 对 symlink 目录返回 false，用 statSync 跟随 symlink 判断
      const isDir =
        entry.isDirectory() ||
        (entry.isSymbolicLink() &&
          (() => {
            try {
              return statSync(join(DOCS_DIR, entry.name)).isDirectory();
            } catch {
              return false;
            }
          })());
      if (!isDir) continue;
      const metaPath = join(DOCS_DIR, entry.name, 'meta.json');
      try {
        const raw = readFileSync(metaPath, 'utf8');
        const meta = JSON.parse(raw) as PartitionMeta;
        if (!meta.root || !meta.title) continue;
        tags.push({ value: entry.name, label: meta.title });
      } catch {
        // 目录无 meta.json 或解析失败，跳过
      }
    }
  } catch {
    // DOCS_DIR 不存在
  }

  return tags;
}
