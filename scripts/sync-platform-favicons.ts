/**
 * 扫描 content/docs/RPA_* 包 index.md 的 platformUrl，增量解析并下载 favicon 到
 * content/docs/public/_shared/；manifest 每条记录附带关联的平台 codes（目录名）。
 *
 * 自动解析失败时：
 * - 交互 TTY：提示用户粘贴图标 URL；回车跳过 → 不写映射，页面回退 Lucide
 * - 非交互：可用 --icon <platformUrl>=<iconUrl> 提供；否则 deferred
 *
 * 自定义登记（不依赖 RPA_* 目录）：
 *   npm run sync:platform-favicons -- --add https://www.taobao.com/ TAOBAO
 *   npm run sync:platform-favicons -- --add https://www.taobao.com/ TAOBAO --icon https://www.taobao.com/=https://...
 *
 * Usage:
 *   npm run sync:platform-favicons
 *   npm run sync:platform-favicons -- --force
 *   npm run sync:platform-favicons -- --icon https://sycm.taobao.com=https://img.alicdn.com/.../x.ico
 *   npm run sync:platform-favicons -- --add https://www.taobao.com/ TAOBAO
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  downloadIcon,
  hostFromPageUrl,
  normalizeSiteUrl,
  platformFaviconKey,
  resolvePlatformIcon,
  SERVABLE_IMAGE_EXTS,
} from '../src/lib/docs/platform-favicon/resolve';
import type {
  PlatformFaviconEntry,
  PlatformFaviconManifest,
} from '../src/lib/docs/platform-favicon/types';
import { parseMetaPanelPlatformUrl } from '../src/lib/docs/source/module-grid-fs-scan';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** 扁平化后平台包位于 content/docs/RPA_* */
const DOCS_DIR = path.join(ROOT, 'content', 'docs');
const SHARED_DIR = path.join(ROOT, 'content', 'docs', 'public', '_shared');
const MANIFEST_PATH = path.join(SHARED_DIR, 'platform-favicons.json');
const FAVICONS_DIR = path.join(SHARED_DIR, 'favicons');
/** 文档目录扫描用：仅 RPA_* 包 */
const PLATFORM_CODE_RE = /^RPA_[A-Z0-9_]+$/;
/** frontmatter icon / --add 名称：大写字母开头的 UPPER_SNAKE */
const ICON_CODE_RE = /^[A-Z][A-Z0-9_]*$/;

const FORCE =
  process.argv.includes('--force') ||
  process.env.FORCE === '1' ||
  process.env.FORCE_PLATFORM_FAVICON_REFRESH === '1';

type SyncStatus = 'added' | 'skipped' | 'deferred' | 'failed';

type PlatformTarget = {
  /** manifest / 匹配用：origin host */
  key: string;
  /** 抓取用：规范化后的完整 platformUrl */
  pageUrl: string;
  /** 关联的平台包 Code（目录名），同一 host 可多个 */
  codes: string[];
};

type CliAddSpec = {
  pageUrl: string;
  key: string;
  code: string;
};

function mergeCodesList(a: string[] | undefined, b: string[]): string[] {
  const set = new Set([...(a ?? []), ...b]);
  return [...set].sort((x, y) => x.localeCompare(y));
}

function attachCodes(
  entry: Omit<PlatformFaviconEntry, 'codes'> & { codes?: string[] },
  codes: string[],
): PlatformFaviconEntry {
  return {
    host: entry.host,
    codes: mergeCodesList(entry.codes, codes),
    file: entry.file,
    sourceIcon: entry.sourceIcon,
    ...(entry.custom ? { custom: true } : {}),
  };
}

function parseCliIconOverrides(argv: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--icon' && argv[i + 1]) {
      const raw = argv[i + 1]!;
      i += 1;
      const eq = raw.indexOf('=');
      if (eq <= 0) {
        console.warn(`忽略无效 --icon 参数（需 platformUrl=iconUrl）：${raw}`);
        continue;
      }
      try {
        const platform = platformFaviconKey(raw.slice(0, eq));
        const icon = raw.slice(eq + 1).trim();
        if (!icon) {
          console.warn(`忽略空图标 URL：${raw}`);
          continue;
        }
        map.set(platform, icon);
      } catch {
        console.warn(`忽略无效 --icon platformUrl：${raw}`);
      }
      continue;
    }
    if (arg?.startsWith('--icon=')) {
      const raw = arg.slice('--icon='.length);
      const eq = raw.indexOf('=');
      if (eq <= 0) continue;
      try {
        map.set(platformFaviconKey(raw.slice(0, eq)), raw.slice(eq + 1).trim());
      } catch {
        // ignore
      }
    }
  }
  return map;
}

/**
 * 解析 `--add <url> <code>` 或 `--add=<url>=<code>`。
 * 例：`--add https://www.taobao.com/ TAOBAO`
 */
function parseCliAdds(argv: string[]): CliAddSpec[] {
  const adds: CliAddSpec[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--add') {
      const urlRaw = argv[i + 1];
      const codeRaw = argv[i + 2];
      if (!urlRaw || urlRaw.startsWith('--') || !codeRaw || codeRaw.startsWith('--')) {
        console.warn('忽略无效 --add（需：--add <url> <code>）');
        continue;
      }
      i += 2;
      const spec = toAddSpec(urlRaw, codeRaw);
      if (spec) adds.push(spec);
      continue;
    }
    if (arg?.startsWith('--add=')) {
      const raw = arg.slice('--add='.length);
      const eq = raw.indexOf('=');
      if (eq <= 0) {
        console.warn(`忽略无效 --add=（需 url=code）：${arg}`);
        continue;
      }
      const spec = toAddSpec(raw.slice(0, eq), raw.slice(eq + 1));
      if (spec) adds.push(spec);
    }
  }
  return adds;
}

function toAddSpec(urlRaw: string, codeRaw: string): CliAddSpec | null {
  const code = codeRaw.trim();
  if (!ICON_CODE_RE.test(code)) {
    console.warn(
      `忽略无效 --add code（需 UPPER_SNAKE，如 TAOBAO / RPA_FOO）：${codeRaw}`,
    );
    return null;
  }
  try {
    const pageUrl = normalizeSiteUrl(urlRaw.trim());
    const key = platformFaviconKey(pageUrl);
    return { pageUrl, key, code };
  } catch {
    console.warn(`忽略无效 --add url：${urlRaw}`);
    return null;
  }
}

const CLI_ARGV = process.argv.slice(2);
const CLI_ICON_OVERRIDES = parseCliIconOverrides(CLI_ARGV);
const CLI_ADDS = parseCliAdds(CLI_ARGV);

async function collectPlatformTargets(): Promise<PlatformTarget[]> {
  const byKey = new Map<string, PlatformTarget>();
  let entries: string[];
  try {
    entries = await readdir(DOCS_DIR);
  } catch {
    return [];
  }

  for (const name of entries.sort()) {
    if (!PLATFORM_CODE_RE.test(name)) continue;

    const indexMd = path.join(DOCS_DIR, name, 'index.md');
    const indexMdx = path.join(DOCS_DIR, name, 'index.mdx');
    for (const filePath of [indexMd, indexMdx]) {
      let raw: string;
      try {
        raw = await readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      const platformUrl = parseMetaPanelPlatformUrl(raw);
      if (!platformUrl) continue;
      try {
        const pageUrl = normalizeSiteUrl(platformUrl);
        const key = platformFaviconKey(pageUrl);
        const prev = byKey.get(key);
        if (prev) {
          prev.codes = mergeCodesList(prev.codes, [name]);
        } else {
          byKey.set(key, { key, pageUrl, codes: [name] });
        }
      } catch (err) {
        console.warn(`[skip] invalid platformUrl in ${filePath}: ${platformUrl}`, err);
      }
      // 同一包只读到一个 index 即可
      break;
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

async function loadManifest(): Promise<PlatformFaviconManifest> {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const data = JSON.parse(raw) as PlatformFaviconManifest;
    if (!data || typeof data !== 'object' || !data.icons || typeof data.icons !== 'object') {
      return { generatedAt: new Date(0).toISOString(), icons: {} };
    }
    return { generatedAt: data.generatedAt ?? '', icons: data.icons };
  } catch {
    return { generatedAt: new Date(0).toISOString(), icons: {} };
  }
}

function pickServableExt(ext: string): string | null {
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  if (SERVABLE_IMAGE_EXTS.has(normalized)) return normalized;
  if (normalized === 'ico') return 'ico';
  return null;
}

async function promptIconUrl(key: string, pageUrl: string): Promise<string | null> {
  const fromCli = CLI_ICON_OVERRIDES.get(key);
  if (fromCli) {
    console.log(`  使用 --icon 提供的地址：${fromCli}`);
    return fromCli;
  }

  if (!input.isTTY || !output.isTTY) {
    console.warn(
      `  非交互环境：请用 --icon ${pageUrl}=<图标URL> 提供，或稍后在 TTY 下重跑；将跳过（Lucide 兜底）`,
    );
    return null;
  }

  const rl = createInterface({ input, output });
  try {
    console.log('');
    console.log(`  未能自动解析平台图标：${pageUrl}（key=${key}）`);
    console.log('  请粘贴图标直链（png/ico/svg/webp/jpg），直接回车则跳过并使用 Lucide 兜底。');
    const answer = (await rl.question('  图标 URL> ')).trim();
    return answer || null;
  } finally {
    rl.close();
  }
}

async function downloadAndStore(
  pageUrl: string,
  iconUrl: string,
  codes: string[],
  options?: { custom?: boolean },
): Promise<PlatformFaviconEntry> {
  const downloaded = await downloadIcon(iconUrl);
  const ext = pickServableExt(downloaded.ext);
  if (!ext) {
    throw new Error(`不支持的图标类型 .${downloaded.ext}（source: ${iconUrl}）`);
  }

  const host = hostFromPageUrl(pageUrl);
  const relativeFile = `favicons/${host}.${ext}`;
  const destPath = path.join(SHARED_DIR, relativeFile);
  await mkdir(path.dirname(destPath), { recursive: true });

  for (const oldExt of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico']) {
    if (oldExt === ext) continue;
    try {
      await unlink(path.join(SHARED_DIR, `favicons/${host}.${oldExt}`));
    } catch {
      // ignore
    }
  }

  await writeFile(destPath, downloaded.bytes);

  return attachCodes(
    {
      host,
      file: relativeFile,
      sourceIcon: iconUrl,
      ...(options?.custom ? { custom: true } : {}),
    },
    codes,
  );
}

async function syncOne(
  target: PlatformTarget,
  existing: PlatformFaviconEntry | undefined,
): Promise<{ status: SyncStatus; entry?: PlatformFaviconEntry; error?: string }> {
  const { key, pageUrl, codes } = target;
  const cliIcon = CLI_ICON_OVERRIDES.get(key);

  // 已有映射且未 --force、也未对该 host 传 --icon → 跳过（仍刷新 codes）
  if (!FORCE && !cliIcon && existing?.file) {
    return {
      status: 'skipped',
      entry: attachCodes(
        { ...existing, ...(existing.custom ? { custom: true } : {}) },
        codes,
      ),
    };
  }

  try {
    // --icon 优先于自动解析（便于纠正错误映射）
    let iconUrl: string | null = cliIcon ?? null;
    if (cliIcon) {
      console.log(`  使用 --icon 提供的地址：${cliIcon}`);
    } else {
      const resolved = await resolvePlatformIcon(pageUrl);
      iconUrl = resolved.icon;
    }

    if (!iconUrl) {
      iconUrl = await promptIconUrl(key, pageUrl);
      if (!iconUrl) {
        return { status: 'deferred' };
      }
    }

    const entry = await downloadAndStore(pageUrl, iconUrl, codes, {
      custom: existing?.custom,
    });
    return { status: 'added', entry };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 自动解析到了 URL 但下载失败时，也允许用户改填
    const manual = await promptIconUrl(key, pageUrl);
    if (!manual) {
      return { status: 'deferred', error: message };
    }
    try {
      const entry = await downloadAndStore(pageUrl, manual, codes, {
        custom: existing?.custom,
      });
      return { status: 'added', entry };
    } catch (err2) {
      const message2 = err2 instanceof Error ? err2.message : String(err2);
      return { status: 'failed', error: message2 };
    }
  }
}

/** 保留非 RPA_* 的自定义 code（如 TAOBAO），避免常规 sync 冲掉 --add 别名。 */
function preserveNonPackageCodes(existingCodes: string[] | undefined): string[] {
  return (existingCodes ?? []).filter((c) => !PLATFORM_CODE_RE.test(c));
}

function isRetainableCustom(entry: PlatformFaviconEntry): boolean {
  if (entry.custom) return true;
  return (entry.codes ?? []).some((c) => !PLATFORM_CODE_RE.test(c));
}

async function addCustomEntry(
  spec: CliAddSpec,
  existing: PlatformFaviconEntry | undefined,
): Promise<{ status: SyncStatus; entry?: PlatformFaviconEntry; error?: string }> {
  const { key, pageUrl, code } = spec;
  const cliIcon = CLI_ICON_OVERRIDES.get(key);
  const codes = mergeCodesList(existing?.codes, [code]);

  // 已有文件且未 --force、未对该 host 传 --icon → 只合并 code + 标 custom
  if (!FORCE && !cliIcon && existing?.file) {
    return {
      status: 'skipped',
      entry: {
        ...attachCodes(existing, codes),
        custom: true,
      },
    };
  }

  try {
    let iconUrl: string | null = cliIcon ?? null;
    if (cliIcon) {
      console.log(`  使用 --icon 提供的地址：${cliIcon}`);
    } else {
      const resolved = await resolvePlatformIcon(pageUrl);
      iconUrl = resolved.icon;
    }

    if (!iconUrl) {
      iconUrl = await promptIconUrl(key, pageUrl);
      if (!iconUrl) {
        return { status: 'deferred' };
      }
    }

    const entry = await downloadAndStore(pageUrl, iconUrl, codes, { custom: true });
    return { status: 'added', entry };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const manual = await promptIconUrl(key, pageUrl);
    if (!manual) {
      return { status: 'deferred', error: message };
    }
    try {
      const entry = await downloadAndStore(pageUrl, manual, codes, { custom: true });
      return { status: 'added', entry };
    } catch (err2) {
      const message2 = err2 instanceof Error ? err2.message : String(err2);
      return { status: 'failed', error: message2 };
    }
  }
}

async function main() {
  const targets = await collectPlatformTargets();
  if (targets.length === 0 && CLI_ADDS.length === 0) {
    console.log('未找到任何 platformUrl，且未指定 --add，退出。');
    return;
  }

  await mkdir(FAVICONS_DIR, { recursive: true });
  const manifest = await loadManifest();
  // 兼容旧 manifest（key 为完整 URL / 缺 codes）：迁移为 host key + codes[]
  const nextIcons: Record<string, PlatformFaviconEntry> = {};
  for (const [rawKey, entry] of Object.entries(manifest.icons)) {
    try {
      const key = platformFaviconKey(rawKey.includes('://') ? rawKey : `https://${rawKey}`);
      nextIcons[key] = attachCodes(entry, entry.codes ?? []);
    } catch {
      nextIcons[rawKey] = attachCodes(entry, entry.codes ?? []);
    }
  }

  let added = 0;
  let skipped = 0;
  let deferred = 0;
  let failed = 0;

  if (targets.length > 0) {
    console.log(
      `同步平台 favicon：共 ${targets.length} 个 origin${FORCE ? '（--force）' : '（增量）'}`,
    );
  }
  if (CLI_ICON_OVERRIDES.size > 0) {
    console.log(`CLI --icon 覆盖：${CLI_ICON_OVERRIDES.size} 条`);
  }
  if (CLI_ADDS.length > 0) {
    console.log(`CLI --add 自定义：${CLI_ADDS.length} 条`);
  }

  for (const target of targets) {
    const result = await syncOne(target, nextIcons[target.key]);
    const codesLabel = target.codes.join(',');
    if (result.status === 'skipped') {
      skipped += 1;
      nextIcons[target.key] = result.entry!;
      console.log(`  skip     ${target.key} [${codesLabel}]`);
      continue;
    }
    if (result.status === 'deferred') {
      deferred += 1;
      // 保留已有映射，避免 --force 时解析失败把可用图标清掉
      const kept = nextIcons[target.key];
      if (kept?.file) {
        nextIcons[target.key] = attachCodes(kept, target.codes);
        console.warn(
          `  deferred ${target.key} [${codesLabel}]（未解析到新图标，保留已有 ${kept.file}）`,
        );
      } else {
        delete nextIcons[target.key];
        console.warn(
          `  deferred ${target.key} [${codesLabel}]（未提供图标，页面将使用 Lucide 兜底）`,
        );
      }
      continue;
    }
    if (result.status === 'failed') {
      failed += 1;
      console.warn(`  fail     ${target.key} [${codesLabel}]: ${result.error}`);
      continue;
    }
    added += 1;
    nextIcons[target.key] = result.entry!;
    console.log(
      `  add      ${target.key} [${codesLabel}] → ${result.entry!.file}`,
    );
  }

  for (const spec of CLI_ADDS) {
    const result = await addCustomEntry(spec, nextIcons[spec.key]);
    if (result.status === 'skipped') {
      skipped += 1;
      nextIcons[spec.key] = result.entry!;
      console.log(`  skip     ${spec.key} [${spec.code}]（custom）`);
      continue;
    }
    if (result.status === 'deferred') {
      deferred += 1;
      const kept = nextIcons[spec.key];
      if (kept?.file) {
        nextIcons[spec.key] = {
          ...attachCodes(kept, [spec.code]),
          custom: true,
        };
        console.warn(
          `  deferred ${spec.key} [${spec.code}]（未解析到新图标，保留已有 ${kept.file}）`,
        );
      } else {
        console.warn(
          `  deferred ${spec.key} [${spec.code}]（未提供图标，未写入）`,
        );
      }
      continue;
    }
    if (result.status === 'failed') {
      failed += 1;
      console.warn(`  fail     ${spec.key} [${spec.code}]: ${result.error}`);
      continue;
    }
    added += 1;
    nextIcons[spec.key] = result.entry!;
    console.log(
      `  add      ${spec.key} [${spec.code}] → ${result.entry!.file}（custom）`,
    );
  }

  const scannedKeys = new Set(targets.map((t) => t.key));
  const pruned: Record<string, PlatformFaviconEntry> = {};

  for (const target of targets) {
    const entry = nextIcons[target.key];
    if (!entry) continue;
    const codes = mergeCodesList(
      target.codes,
      preserveNonPackageCodes(entry.codes),
    );
    pruned[target.key] = {
      ...attachCodes({ ...entry, codes: [] }, codes),
      ...(entry.custom || isRetainableCustom(entry) ? { custom: true } : {}),
    };
  }

  // 保留 --add / 自定义 code 条目（即使不在 RPA_* 扫描结果中）
  for (const [key, entry] of Object.entries(nextIcons)) {
    if (scannedKeys.has(key)) continue;
    if (!entry?.file || !isRetainableCustom(entry)) continue;
    pruned[key] = {
      ...attachCodes(entry, entry.codes ?? []),
      custom: true,
    };
  }

  const out: PlatformFaviconManifest = {
    generatedAt: new Date().toISOString(),
    icons: Object.fromEntries(
      Object.entries(pruned).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  console.log(
    `完成：added=${added} skipped=${skipped} deferred=${deferred} failed=${failed}`,
  );
  console.log(`manifest → ${path.relative(ROOT, MANIFEST_PATH)}`);
  if (deferred > 0) {
    console.log(
      '提示：deferred 且无已有映射的平台未写入；有已有文件的会保留。可用 --icon / --add 补全。',
    );
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
