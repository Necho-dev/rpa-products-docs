import { createDecipheriv, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { cubeOriginPatternSource, secretsFilePath } from '@/lib/auth/auth-config';
import { finishSecretsLog } from '@/lib/observability/secrets-audit-log';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/** 对齐 PyCryptodome AES-ECB + PKCS7 unpad（密钥为 appSecret ASCII 字节） */
export function aesEcbDecrypt(cipherB64: string, keyAscii: string): string {
  const key = Buffer.from(keyAscii, 'ascii');
  if (![16, 24, 32].includes(key.length)) {
    throw new Error('invalid AES key length');
  }
  const cipherBytes = Buffer.from(cipherB64, 'base64');
  const decipher = createDecipheriv(`aes-${key.length * 8}-ecb`, key, null);
  decipher.setAutoPadding(true);
  const plain = Buffer.concat([decipher.update(cipherBytes), decipher.final()]);
  return plain.toString('utf8');
}

let compiledOrigin: RegExp | null = null;

function originPattern(): RegExp {
  if (!compiledOrigin) compiledOrigin = new RegExp(cubeOriginPatternSource());
  return compiledOrigin;
}

export function isValidCubeOrigin(origin: unknown): origin is string {
  return typeof origin === 'string' && origin.length > 0 && originPattern().test(origin);
}

export type SecretsMap = Record<string, string>;

let cachedSecrets: SecretsMap | null = null;
let cachedSecretsPath: string | null = null;
/** 缓存文件的 mtimeMs */
let cachedSecretsMtimeMs: number | null = null;

function secretsFileMtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

function parseSecretsJson(raw: string): SecretsMap {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid secrets.json');
  }
  const map: SecretsMap = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string' && v) map[k] = v;
  }
  return map;
}

function commitSecretsCache(
  path: string,
  map: SecretsMap,
  mtimeMs: number | null,
  previousCount: number | undefined,
): SecretsMap {
  const isReload = previousCount !== undefined;
  cachedSecrets = map;
  cachedSecretsPath = path;
  cachedSecretsMtimeMs = mtimeMs;

  const secretCount = Object.keys(map).length;
  finishSecretsLog({
    outcome: secretCount === 0 && mtimeMs === null ? 'empty' : isReload ? 'reload' : 'load',
    path,
    secretCount,
    previousCount,
    mtimeMs,
  });
  return map;
}

/**
 * 读取嵌入/SSO 验签密钥表。
 * 按文件 mtime 失效内存缓存：宿主机改写 secrets.json 后无需重启进程。
 * 配合 Compose 目录挂载（而非单文件挂载），atomic `mv` 换 inode 时容器内可见。
 */
export function loadSecrets(): SecretsMap {
  const path = secretsFilePath();
  const mtimeMs = secretsFileMtimeMs(path);

  if (
    cachedSecrets &&
    cachedSecretsPath === path &&
    cachedSecretsMtimeMs === mtimeMs
  ) {
    return cachedSecrets;
  }

  const previousCount =
    cachedSecrets && cachedSecretsPath === path ? Object.keys(cachedSecrets).length : undefined;

  if (mtimeMs === null) {
    return commitSecretsCache(path, {}, null, previousCount);
  }

  try {
    const map = parseSecretsJson(readFileSync(path, 'utf8'));
    return commitSecretsCache(path, map, mtimeMs, previousCount);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return commitSecretsCache(path, {}, null, previousCount);
    }
    throw err;
  }
}

export function getSecretByHash(sh: string): string | undefined {
  return loadSecrets()[sh];
}

export function isKnownSecretHash(sh: string): boolean {
  return Boolean(getSecretByHash(sh));
}

/** 测试或强制丢弃缓存时重置 */
export function resetSecretsCache(): void {
  cachedSecrets = null;
  cachedSecretsPath = null;
  cachedSecretsMtimeMs = null;
}
