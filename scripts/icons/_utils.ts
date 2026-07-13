import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 项目根目录（documents/） */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** content/docs/_public/_shared/ 绝对路径 */
export const SHARED_DIR = path.join(ROOT, 'content/docs/_public/_shared');

export function parseArg(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('--') ? argv[i + 1] : undefined;
}

export function parseFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function extOf(filePath: string): string {
  return path.extname(filePath).slice(1).toLowerCase();
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
  options?: { ensureDir?: string },
): Promise<void> {
  if (options?.ensureDir) {
    await mkdir(options.ensureDir, { recursive: true });
  }
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function relFromRoot(absPath: string): string {
  return path.relative(ROOT, absPath);
}
