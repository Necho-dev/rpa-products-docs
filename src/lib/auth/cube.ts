import { createDecipheriv, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cubeOriginPatternSource, secretsFilePath } from '@/lib/auth/auth-config';

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

export function loadSecrets(): SecretsMap {
  const path = secretsFilePath();
  if (cachedSecrets && cachedSecretsPath === path) return cachedSecrets;
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid secrets.json');
    }
    const map: SecretsMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v) map[k] = v;
    }
    cachedSecrets = map;
    cachedSecretsPath = path;
    return map;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return {};
    throw err;
  }
}

export function getSecretByHash(sh: string): string | undefined {
  return loadSecrets()[sh];
}

export function isKnownSecretHash(sh: string): boolean {
  return Boolean(getSecretByHash(sh));
}

/** 测试或热更新时重置缓存 */
export function resetSecretsCache(): void {
  cachedSecrets = null;
  cachedSecretsPath = null;
}
