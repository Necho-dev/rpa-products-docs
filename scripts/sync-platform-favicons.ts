/**
 * 扫描 connectors 包 index.md 的 platformUrl，增量解析并下载 favicon 到
 * content/docs/public/_shared/
 *
 * 自动解析失败时：
 * - 交互 TTY：提示用户粘贴图标 URL；回车跳过 → 不写映射，页面回退 Lucide
 * - 非交互：可用 --icon <platformUrl>=<iconUrl> 提供；否则 deferred
 *
 * Usage:
 *   npm run sync:platform-favicons
 *   npm run sync:platform-favicons -- --force
 *   npm run sync:platform-favicons -- --icon https://sycm.taobao.com=https://img.alicdn.com/.../x.ico
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
const CONNECTORS_DIR = path.join(ROOT, 'content', 'docs', 'connectors');
const SHARED_DIR = path.join(ROOT, 'content', 'docs', 'public', '_shared');
const MANIFEST_PATH = path.join(SHARED_DIR, 'platform-favicons.json');
const FAVICONS_DIR = path.join(SHARED_DIR, 'favicons');

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
};

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

const CLI_ICON_OVERRIDES = parseCliIconOverrides(process.argv.slice(2));

async function collectPlatformTargets(): Promise<PlatformTarget[]> {
  const byKey = new Map<string, PlatformTarget>();
  let entries: string[];
  try {
    entries = await readdir(CONNECTORS_DIR);
  } catch {
    return [];
  }

  for (const name of entries.sort()) {
    const indexMd = path.join(CONNECTORS_DIR, name, 'index.md');
    const indexMdx = path.join(CONNECTORS_DIR, name, 'index.mdx');
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
        if (!byKey.has(key)) {
          byKey.set(key, { key, pageUrl });
        }
      } catch (err) {
        console.warn(`[skip] invalid platformUrl in ${filePath}: ${platformUrl}`, err);
      }
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

  return {
    host,
    file: relativeFile,
    sourceIcon: iconUrl,
  };
}

async function syncOne(
  target: PlatformTarget,
  existing: PlatformFaviconEntry | undefined,
): Promise<{ status: SyncStatus; entry?: PlatformFaviconEntry; error?: string }> {
  const { key, pageUrl } = target;
  const cliIcon = CLI_ICON_OVERRIDES.get(key);

  // 已有映射且未 --force、也未对该 host 传 --icon → 跳过
  if (!FORCE && !cliIcon && existing?.file) {
    return { status: 'skipped', entry: existing };
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

    const entry = await downloadAndStore(pageUrl, iconUrl);
    return { status: 'added', entry };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 自动解析到了 URL 但下载失败时，也允许用户改填
    const manual = await promptIconUrl(key, pageUrl);
    if (!manual) {
      return { status: 'deferred', error: message };
    }
    try {
      const entry = await downloadAndStore(pageUrl, manual);
      return { status: 'added', entry };
    } catch (err2) {
      const message2 = err2 instanceof Error ? err2.message : String(err2);
      return { status: 'failed', error: message2 };
    }
  }
}

async function main() {
  const targets = await collectPlatformTargets();
  if (targets.length === 0) {
    console.log('未找到任何 platformUrl，退出。');
    return;
  }

  await mkdir(FAVICONS_DIR, { recursive: true });
  const manifest = await loadManifest();
  // 兼容旧 manifest（key 为完整 URL）：迁移为 host key
  const nextIcons: Record<string, PlatformFaviconEntry> = {};
  for (const [rawKey, entry] of Object.entries(manifest.icons)) {
    try {
      const key = platformFaviconKey(rawKey.includes('://') ? rawKey : `https://${rawKey}`);
      nextIcons[key] = entry;
    } catch {
      nextIcons[rawKey] = entry;
    }
  }

  let added = 0;
  let skipped = 0;
  let deferred = 0;
  let failed = 0;

  console.log(
    `同步平台 favicon：共 ${targets.length} 个 origin${FORCE ? '（--force）' : '（增量）'}`,
  );
  if (CLI_ICON_OVERRIDES.size > 0) {
    console.log(`CLI --icon 覆盖：${CLI_ICON_OVERRIDES.size} 条`);
  }

  for (const target of targets) {
    const result = await syncOne(target, nextIcons[target.key]);
    if (result.status === 'skipped') {
      skipped += 1;
      console.log(`  skip     ${target.key}`);
      continue;
    }
    if (result.status === 'deferred') {
      deferred += 1;
      delete nextIcons[target.key];
      console.warn(
        `  deferred ${target.key}（未提供图标，页面将使用 Lucide 兜底）`,
      );
      continue;
    }
    if (result.status === 'failed') {
      failed += 1;
      console.warn(`  fail     ${target.key}: ${result.error}`);
      continue;
    }
    added += 1;
    nextIcons[target.key] = result.entry!;
    console.log(`  add      ${target.key} → ${result.entry!.file}`);
  }

  const pruned: Record<string, PlatformFaviconEntry> = {};
  for (const target of targets) {
    if (nextIcons[target.key]) pruned[target.key] = nextIcons[target.key]!;
  }

  const out: PlatformFaviconManifest = {
    generatedAt: new Date().toISOString(),
    icons: pruned,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  console.log(
    `完成：added=${added} skipped=${skipped} deferred=${deferred} failed=${failed}`,
  );
  console.log(`manifest → ${path.relative(ROOT, MANIFEST_PATH)}`);
  if (deferred > 0) {
    console.log('提示：deferred 的平台未写入映射，ModuleCard / MetaPanel 将回退 Lucide。');
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
