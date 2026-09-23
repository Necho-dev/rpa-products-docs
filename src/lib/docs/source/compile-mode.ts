import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** 
 * 根 meta.json 的 compile 配置, 省略时按构建期编译(build) 
 * 支持的编译模式: build(构建期编译), runtime(运行时编译)
 */
export type PartitionCompileMode = 'build' | 'runtime';

const DOCS_DIR = path.join(process.cwd(), 'content/docs');

function isDirectory(fullPath: string, entry: { isDirectory(): boolean; isSymbolicLink(): boolean }): boolean {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 只读 content/docs/<分区>/meta.json 文件配置, 子目录里的 `compile` 不识别
 */
export function readPartitionCompileModes(docsDir = DOCS_DIR): Map<string, PartitionCompileMode> {
  const modes = new Map<string, PartitionCompileMode>();
  let entries;
  try {
    entries = readdirSync(docsDir, { withFileTypes: true });
  } catch {
    return modes;
  }
  for (const entry of entries) {
    const full = path.join(docsDir, entry.name);
    if (!isDirectory(full, entry)) continue;
    let compile: unknown;
    try {
      compile = (JSON.parse(readFileSync(path.join(full, 'meta.json'), 'utf8')) as { compile?: unknown }).compile;
    } catch {
      continue;
    }
    if (compile === 'runtime' || compile === 'build') modes.set(entry.name, compile);
  }
  return modes;
}

export function runtimePartitionNames(docsDir = DOCS_DIR): string[] {
  return [...readPartitionCompileModes(docsDir).entries()]
    .filter(([, mode]) => mode === 'runtime')
    .map(([name]) => name)
    .sort();
}

let runtimeSlugCache: Set<string> | null = null;

export function isRuntimePartition(slug: string | undefined): boolean {
  if (!slug) return false;
  runtimeSlugCache ??= new Set(runtimePartitionNames());
  return runtimeSlugCache.has(slug);
}
