/**
 * Shared icons 分组 CLI（icons:shared）
 *
 * manifest : content/docs/_public/_shared/shared-icons.json
 * 图标目录 : content/docs/_public/_shared/icons/
 */
import { copyFile, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SharedIconEntry, SharedIconManifest } from '../../src/lib/docs/shared-icons/types';
import {
  extOf,
  parseArg,
  parseFlag,
  readJsonFile,
  relFromRoot,
  ROOT,
  SHARED_DIR,
  writeJsonFile,
} from './_utils';

const MANIFEST_RELATIVE =
  process.env.DOCS_SHARED_ICONS_MANIFEST_PATH?.trim() ||
  'content/docs/_public/_shared/shared-icons.json';
const MANIFEST_PATH = path.join(ROOT, MANIFEST_RELATIVE);
const ICONS_DIR = path.join(SHARED_DIR, 'icons');

const ALLOWED_EXTS = new Set(['svg', 'png', 'webp', 'jpg', 'jpeg', 'ico']);
const NAME_RE = /^[A-Z][A-Za-z0-9_]*$/;

async function loadManifest(): Promise<SharedIconManifest> {
  const data = await readJsonFile<SharedIconManifest>(MANIFEST_PATH, {
    updatedAt: '',
    icons: {},
  });
  if (!data?.icons || typeof data.icons !== 'object') {
    return { updatedAt: '', icons: {} };
  }
  return { updatedAt: data.updatedAt ?? '', icons: data.icons };
}

async function saveManifest(icons: Record<string, SharedIconEntry>): Promise<void> {
  const out: SharedIconManifest = {
    updatedAt: new Date().toISOString(),
    icons: Object.fromEntries(
      Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  await writeJsonFile(MANIFEST_PATH, out, { ensureDir: SHARED_DIR });
  console.log(`✔ manifest 已保存 → ${relFromRoot(MANIFEST_PATH)}`);
}

async function downloadBytes(url: string): Promise<{ bytes: Buffer; ext: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);

  const ct = res.headers.get('content-type') ?? '';
  const extFromCt: Record<string, string> = {
    'image/svg+xml': 'svg',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  };
  const ctExt = Object.entries(extFromCt).find(([k]) => ct.includes(k))?.[1];
  const urlExt = extOf(new URL(url).pathname);
  const ext = ctExt ?? (ALLOWED_EXTS.has(urlExt) ? urlExt : '');
  if (!ext) throw new Error(`无法推断图标类型（Content-Type: ${ct}，URL: ${url}）`);

  return { bytes: Buffer.from(await res.arrayBuffer()), ext };
}

async function cmdAdd(argv: string[]): Promise<void> {
  const positionals = argv.filter((a) => !a.startsWith('--'));
  const name = positionals[0];
  const srcFile = positionals[1];
  const srcUrl = parseArg(argv, '--url');
  const desc = parseArg(argv, '--desc');
  const force = parseFlag(argv, '--force');

  if (!name) {
    console.error('用法：add <name> <filePath>  或  add <name> --url <imageUrl>');
    process.exit(1);
  }
  if (!NAME_RE.test(name)) {
    console.error(
      `无效 icon name（需以大写字母开头，仅含字母/数字/下划线，如 MyBrand / AUTH_WECHAT）：${name}`,
    );
    process.exit(1);
  }
  if (!srcFile && !srcUrl) {
    console.error('请提供本地文件路径或 --url <imageUrl>');
    process.exit(1);
  }

  const manifest = await loadManifest();
  if (!force && manifest.icons[name]) {
    console.error(`icon "${name}" 已存在（用 --force 强制覆盖）：${manifest.icons[name]!.file}`);
    process.exit(1);
  }

  await mkdir(ICONS_DIR, { recursive: true });

  let destRelative: string;

  if (srcUrl) {
    console.log(`  下载 ${srcUrl} …`);
    const { bytes, ext } = await downloadBytes(srcUrl);
    if (!ALLOWED_EXTS.has(ext)) {
      console.error(`不支持的图标类型 .${ext}，支持：${[...ALLOWED_EXTS].join(', ')}`);
      process.exit(1);
    }
    destRelative = `icons/${name}.${ext}`;
    await writeFile(path.join(SHARED_DIR, destRelative), bytes);
    console.log(`  ✔ 下载完成 → ${destRelative}`);
  } else {
    const abs = path.resolve(srcFile!);
    const ext = extOf(abs);
    if (!ALLOWED_EXTS.has(ext)) {
      console.error(`不支持的图标类型 .${ext}，支持：${[...ALLOWED_EXTS].join(', ')}`);
      process.exit(1);
    }
    destRelative = `icons/${name}.${ext}`;
    await copyFile(abs, path.join(SHARED_DIR, destRelative));
    console.log(`  ✔ 复制完成 → ${destRelative}`);
  }

  manifest.icons[name] = {
    file: destRelative,
    ...(desc ? { description: desc } : {}),
  };
  await saveManifest(manifest.icons);
  console.log(`✔ 已注册 icon "${name}" → ${destRelative}`);
  console.log(`  在 frontmatter 中引用：icon: ${name}`);
}

async function cmdList(argv: string[]): Promise<void> {
  const manifest = await loadManifest();
  const entries = Object.entries(manifest.icons);

  if (entries.length === 0) {
    console.log('shared-icons manifest 为空。');
    console.log(`\n提示：使用 npm run icons:shared -- add <name> <file> 注册图标。`);
    return;
  }

  if (parseFlag(argv, '--names')) {
    console.log(entries.map(([n]) => n).join('\n'));
    return;
  }

  console.log(`manifest: ${relFromRoot(MANIFEST_PATH)}`);
  console.log(`updatedAt: ${manifest.updatedAt || '(unknown)'}`);
  console.log(`共 ${entries.length} 个 shared icons：\n`);
  for (const [name, entry] of entries) {
    console.log(`  ${name}`);
    console.log(`    file : ${entry.file}`);
    if (entry.description) console.log(`    desc : ${entry.description}`);
    console.log(`    url  : /resources/images/_public/_shared/${entry.file}`);
  }
}

async function cmdRemove(argv: string[]): Promise<void> {
  const name = argv.filter((a) => !a.startsWith('--'))[0];
  if (!name) {
    console.error('用法：remove <name> [--purge]');
    process.exit(1);
  }

  const manifest = await loadManifest();
  const entry = manifest.icons[name];
  if (!entry) {
    console.error(`未找到 icon "${name}"，可用 npm run icons:shared -- list 查看已注册列表。`);
    process.exit(1);
  }

  const purge = parseFlag(argv, '--purge');
  delete manifest.icons[name];
  await saveManifest(manifest.icons);
  console.log(`✔ 已从 manifest 移除 "${name}"（${entry.file}）`);

  if (purge) {
    try {
      await unlink(path.join(SHARED_DIR, entry.file));
      console.log(`✔ 文件已删除：${entry.file}`);
    } catch {
      console.warn(`  文件不存在或删除失败：${entry.file}`);
    }
  } else {
    console.log(`  图标文件保留（使用 --purge 同时删除文件）：${entry.file}`);
  }
}

function printHelp(): void {
  console.log(`
Shared Icons (icons:shared)
  manifest : ${relFromRoot(MANIFEST_PATH)}
  图标目录 : ${relFromRoot(ICONS_DIR)}/

子命令：
  add <name> <filePath> [--desc <描述>] [--force]
  add <name> --url <imageUrl> [--desc <描述>] [--force]
  list [--names]
  remove <name> [--purge]

引用方式（frontmatter）：icon: MyBrand

示例：
  npm run icons:shared -- add MyBrand ./assets/my-brand.svg
  npm run icons:shared -- add MyBrand --url https://example.com/icon.svg
  npm run icons:shared -- list
  npm run icons:shared -- remove MyBrand --purge
`.trim());
}

export async function runSharedCli(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;

  switch (subcommand) {
    case 'add':
      return cmdAdd(rest);
    case 'list':
      return cmdList(rest);
    case 'remove':
      return cmdRemove(rest);
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`未知子命令：${subcommand}\n`);
      printHelp();
      process.exit(1);
  }
}

export const sharedManifestPath = relFromRoot(MANIFEST_PATH);
export const sharedIconsDir = relFromRoot(ICONS_DIR);
