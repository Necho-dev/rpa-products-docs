/**
 * Platform icons CLI（icons:platform）
 *
 * manifest : content/docs/_public/_shared/platform/icons.json
 * 结构     : { "icons": { "ICO_DEWU": { "file", "sourceIcon", "origin" } } }
 * 文件目录 : content/docs/_public/_shared/platform/files/
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  downloadIcon,
  normalizeSiteUrl,
  resolvePlatformIcon,
  SERVABLE_IMAGE_EXTS,
} from '../../src/lib/docs/platform-favicon/resolve';
import type {
  PlatformIconEntry,
  PlatformIconManifest,
} from '../../src/lib/docs/platform-favicon/types';
import {
  parsePlatformIconCode,
  platformIconCodeError,
} from '../../src/lib/docs/icons/icon-code';
import { readJsonFile, relFromRoot, ROOT, writeJsonFile } from './_utils';

const MANIFEST_RELATIVE =
  process.env.DOCS_FAVICON_MANIFEST_PATH?.trim() ||
  'content/docs/_public/_shared/platform/icons.json';
const MANIFEST_PATH = path.join(ROOT, MANIFEST_RELATIVE);
const PLATFORM_DIR = path.dirname(MANIFEST_PATH);
const FILES_DIR = path.join(PLATFORM_DIR, 'files');

function requirePlatformIconCode(raw: string): string {
  const code = parsePlatformIconCode(raw);
  if (!code) {
    console.error(platformIconCodeError(raw));
    process.exit(1);
    throw new Error('unreachable');
  }
  return code;
}

function looksLikeIconSource(raw: string): boolean {
  return /^(https?:|\/\/|iconfont:|console:|depcloud:)/i.test(raw.trim());
}

function parseIconFlagValues(argv: string[]): string[] {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--icon') {
      const next = argv[++i];
      if (next && !next.startsWith('--')) values.push(next);
      continue;
    }
    if (arg?.startsWith('--icon=')) values.push(arg.slice(7));
  }
  return values;
}

/** `--icon <url>` 或 `--icon ICO_FOO=<url>` / `--icon RPA_FOO=<url>` */
function parseIconFlags(argv: string[]): {
  byCode: Map<string, string>;
  bareUrl?: string;
} {
  const byCode = new Map<string, string>();
  let bareUrl: string | undefined;

  for (const raw of parseIconFlagValues(argv)) {
    const eq = raw.indexOf('=');
    if (eq > 0) {
      const left = raw.slice(0, eq).trim();
      const code = parsePlatformIconCode(left);
      if (code) {
        byCode.set(code, raw.slice(eq + 1).trim());
        continue;
      }
    }
    if (looksLikeIconSource(raw)) {
      bareUrl = raw.trim();
      continue;
    }
    console.warn(`忽略无效 --icon（须为图标 URL，或 ICO_/RPA_CODE=url）：${raw}`);
  }

  return { byCode, bareUrl };
}

async function loadManifest(): Promise<PlatformIconManifest> {
  const data = await readJsonFile<PlatformIconManifest>(MANIFEST_PATH, {
    updatedAt: '',
    icons: {},
  });
  if (!data?.icons || typeof data.icons !== 'object') {
    return { updatedAt: '', icons: {} };
  }
  return { updatedAt: data.updatedAt ?? '', icons: data.icons };
}

async function saveManifest(icons: Record<string, PlatformIconEntry>): Promise<void> {
  const out: PlatformIconManifest = {
    updatedAt: new Date().toISOString(),
    icons: Object.fromEntries(
      Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  await writeJsonFile(MANIFEST_PATH, out, { ensureDir: PLATFORM_DIR });
  console.log(`✔ manifest 已保存 → ${relFromRoot(MANIFEST_PATH)}`);
}

function pickServableExt(ext: string): string | null {
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  if (SERVABLE_IMAGE_EXTS.has(normalized) || normalized === 'ico') return normalized;
  return null;
}

async function promptIconUrl(hint: string): Promise<string | null> {
  if (!input.isTTY || !output.isTTY) {
    console.warn(`  非交互环境：请用 --icon <图标URL> 提供，跳过。`);
    return null;
  }
  const rl = createInterface({ input, output });
  try {
    console.log(`\n  未能自动解析图标：${hint}`);
    console.log('  请粘贴图标直链（png/ico/svg/webp/jpg），回车跳过。');
    const answer = (await rl.question('  图标 URL> ')).trim();
    return answer || null;
  } finally {
    rl.close();
  }
}

async function downloadAndStore(
  code: string,
  origin: string,
  iconUrl: string,
): Promise<PlatformIconEntry> {
  const downloaded = await downloadIcon(iconUrl);
  const ext = pickServableExt(downloaded.ext);
  if (!ext) throw new Error(`不支持的图标类型 .${downloaded.ext}（source: ${iconUrl}）`);

  const relativeFile = `platform/files/${code}.${ext}`;
  const destPath = path.join(FILES_DIR, `${code}.${ext}`);
  await mkdir(FILES_DIR, { recursive: true });

  for (const oldExt of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico']) {
    if (oldExt === ext) continue;
    try {
      await unlink(path.join(FILES_DIR, `${code}.${oldExt}`));
    } catch {
      /* ignore */
    }
  }

  await writeFile(destPath, downloaded.bytes);
  console.log(`  ✔ 下载完成 → _shared/${relativeFile}`);

  return {
    file: relativeFile,
    sourceIcon: iconUrl,
    origin,
  };
}

async function cmdAdd(argv: string[]): Promise<void> {
  const positionals = argv.filter((a) => !a.startsWith('--'));
  const urlRaw = positionals[0];
  const codeRaw = positionals[1];

  if (!urlRaw || !codeRaw) {
    console.error(
      '用法：add <platformUrl> <CODE> [--icon <iconUrl>] [--force]\n' +
        '  CODE 须为 ICO_*，也可传 RPA_*（自动派生，如 RPA_QIANNIU → ICO_QIANNIU）',
    );
    process.exit(1);
  }

  const code = requirePlatformIconCode(codeRaw);
  const inputCode = codeRaw.trim().toUpperCase();
  if (inputCode !== code) {
    console.log(`  CODE ${codeRaw} → ${code}`);
  }

  let siteUrl: string;
  try {
    siteUrl = normalizeSiteUrl(urlRaw.trim());
  } catch {
    console.error(`无效平台 URL：${urlRaw}`);
    process.exit(1);
  }
  const origin = new URL(siteUrl).hostname;

  const force = argv.includes('--force');
  const iconFlags = parseIconFlags(argv);
  const cliIcon = iconFlags.byCode.get(code) ?? iconFlags.bareUrl;

  const manifest = await loadManifest();
  const existing = manifest.icons[code];

  if (!force && !cliIcon && existing?.file) {
    manifest.icons[code] = { ...existing, origin };
    console.log(`  ${code} 已存在，更新 origin（跳过下载；用 --force 强制刷新）`);
    await saveManifest(manifest.icons);
    return;
  }

  console.log(`  正在处理 ${code} …`);

  let iconUrl = cliIcon ?? null;
  if (!iconUrl) {
    iconUrl = (await resolvePlatformIcon(siteUrl)).icon;
  }
  if (!iconUrl) {
    iconUrl = await promptIconUrl(siteUrl);
  }
  if (!iconUrl) {
    console.warn('  未提供图标 URL，操作取消。');
    process.exit(1);
  }

  try {
    manifest.icons[code] = await downloadAndStore(code, origin, iconUrl);
    await saveManifest(manifest.icons);
    console.log(`✔ 已添加/更新：${code}`);
  } catch (err) {
    console.error(`下载失败：${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

async function cmdList(argv: string[]): Promise<void> {
  const manifest = await loadManifest();
  const entries = Object.entries(manifest.icons);

  if (entries.length === 0) {
    console.log('manifest 为空。');
    return;
  }

  if (argv.includes('--names')) {
    console.log(entries.map(([code]) => code).join('\n'));
    return;
  }

  console.log(`manifest: ${relFromRoot(MANIFEST_PATH)}`);
  console.log(`updatedAt: ${manifest.updatedAt || '(unknown)'}`);
  console.log(`共 ${entries.length} 条：\n`);
  for (const [code, entry] of entries) {
    console.log(`  ${code}`);
    console.log(`    file  : ${entry.file ?? '(缺失)'}`);
    console.log(`    origin: ${entry.origin ?? '(未知)'}`);
    console.log(`    source: ${entry.sourceIcon ?? '(未知)'}`);
  }
}

async function cmdRefresh(argv: string[]): Promise<void> {
  const targetCodes = argv
    .filter((a) => !a.startsWith('--'))
    .map((a) => a.trim())
    .filter(Boolean)
    .map((raw) => requirePlatformIconCode(raw));
  const force = argv.includes('--force');
  const iconFlags = parseIconFlags(argv);
  const iconOverrides = iconFlags.byCode;
  if (targetCodes.length === 1 && iconFlags.bareUrl && !iconOverrides.has(targetCodes[0]!)) {
    iconOverrides.set(targetCodes[0]!, iconFlags.bareUrl);
  }

  const manifest = await loadManifest();
  const entries = Object.entries(manifest.icons);

  const toRefresh =
    targetCodes.length > 0
      ? entries.filter(([code]) => targetCodes.includes(code))
      : entries;

  if (toRefresh.length === 0) {
    console.log(
      targetCodes.length > 0
        ? `未找到 CODE：${targetCodes.join(', ')}`
        : 'manifest 为空，无需刷新。',
    );
    return;
  }

  console.log(`刷新 ${toRefresh.length} 条${force ? '（--force）' : ''}：\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const [code, entry] of toRefresh) {
    const cliIcon = iconOverrides.get(code);
    const label = code;

    if (!force && !cliIcon && entry.file) {
      console.log(`  skip  ${label}`);
      skip++;
      continue;
    }

    console.log(`  ↻     ${label}`);
    const platformUrl = entry.origin ? `https://${entry.origin}` : (entry.sourceIcon ?? '');

    if (!platformUrl) {
      console.warn(`  deferred ${label}（无 origin / sourceIcon）`);
      fail++;
      continue;
    }

    let iconUrl: string | null = cliIcon ?? entry.sourceIcon ?? null;
    if (!iconUrl) {
      iconUrl = (await resolvePlatformIcon(platformUrl).catch(() => ({
        icon: null as string | null,
      }))).icon;
    }
    if (!iconUrl) {
      iconUrl = await promptIconUrl(platformUrl);
    }
    if (!iconUrl) {
      console.warn(`  deferred ${label}（无图标来源）`);
      fail++;
      continue;
    }

    try {
      const origin = entry.origin ?? (platformUrl ? new URL(platformUrl).hostname : '');
      manifest.icons[code] = await downloadAndStore(code, origin, iconUrl);
      ok++;
    } catch (err) {
      console.warn(`  fail  ${label}: ${err instanceof Error ? err.message : err}`);
      fail++;
    }
  }

  await saveManifest(manifest.icons);
  console.log(`\n完成：ok=${ok} skipped=${skip} failed=${fail}`);
  if (fail > 0) process.exitCode = 1;
}

async function cmdRemove(argv: string[]): Promise<void> {
  const codeRaw = argv.filter((a) => !a.startsWith('--'))[0];
  if (!codeRaw?.trim()) {
    console.error('用法：remove <CODE>');
    process.exit(1);
  }
  const code = requirePlatformIconCode(codeRaw);

  const manifest = await loadManifest();
  const entry = manifest.icons[code];
  if (!entry) {
    console.error(`未找到 CODE：${code}`);
    process.exit(1);
  }

  delete manifest.icons[code];
  console.log(`  已删除 ${code}（files/ 文件未删除，如需请手动清理 _shared/${entry.file}）`);
  await saveManifest(manifest.icons);
}

function printHelp(): void {
  console.log(`
Platform Icons (icons:platform)
  manifest : ${relFromRoot(MANIFEST_PATH)}
  图标目录 : ${relFromRoot(FILES_DIR)}/

子命令：
  add <platformUrl> <CODE> [--icon <iconUrl>] [--force]
  list [--names]
  refresh [<CODE>...] [--icon <CODE>=<iconUrl>] [--force]
  remove <CODE>

CODE 规则：
  须为 ICO_*；也可传 RPA_*（自动派生，如 RPA_QIANNIU → ICO_QIANNIU）
  磁盘文件与 manifest key 同名：platform/files/<CODE>.<ext>

示例：
  npm run icons:platform -- add https://stark.dewu.com ICO_DEWU
  npm run icons:platform -- add https://myseller.taobao.com/ RPA_QIANNIU --icon https://example.com/favicon.png
  npm run icons:platform -- list
  npm run icons:platform -- refresh ICO_DEWU --force
  npm run icons:platform -- refresh RPA_QIANNIU --icon ICO_QIANNIU=https://example.com/favicon.png
  npm run icons:platform -- remove ICO_TAOBAO
`.trim());
}

export async function runPlatformCli(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;

  switch (subcommand) {
    case 'add':
      return cmdAdd(rest);
    case 'list':
      return cmdList(rest);
    case 'refresh':
      return cmdRefresh(rest);
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

export const platformManifestPath = relFromRoot(MANIFEST_PATH);
export const platformIconsDir = relFromRoot(FILES_DIR);
