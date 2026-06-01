import { createHmac, timingSafeEqual } from 'node:crypto';

/** 对标 itsdangerous URLSafeTimedSerializer（HMAC-SHA1，salt + signer + secret 派生密钥） */
function signingKey(secret: string, salt?: string): Buffer {
  if (!salt) return Buffer.from(secret, 'utf8');
  return Buffer.concat([Buffer.from(salt, 'utf8'), Buffer.from('signer', 'utf8'), Buffer.from(secret, 'utf8')]);
}

function signPayload(key: Buffer, value: string, timestamp: string): string {
  const base = `${value}.${timestamp}`;
  return createHmac('sha1', key).update(base, 'utf8').digest('base64url');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export type TimedPayload = Record<string, unknown>;

export function dumpsTimed(secret: string, payload: TimedPayload, salt?: string): string {
  const key = signingKey(secret, salt);
  const value = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = signPayload(key, value, timestamp);
  return `${value}.${timestamp}.${sig}`;
}

export function loadsTimed(
  secret: string,
  token: string,
  maxAgeSec: number,
  salt?: string,
): TimedPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [value, timestamp, sig] = parts;
  if (!value || !timestamp || !sig) return null;

  const key = signingKey(secret, salt);
  const expected = signPayload(key, value, timestamp);
  if (!timingSafeEqualStr(sig, expected)) return null;

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return null;
  const age = Math.floor(Date.now() / 1000) - ts;
  if (age < 0 || age > maxAgeSec) return null;

  try {
    const json = Buffer.from(value, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as TimedPayload;
  } catch {
    return null;
  }
}

/** 从 timed token 第二段解析过期 Unix 秒（签发时间 + maxAgeSec）。 */
export function timedTokenExpiresAtSec(token: string, maxAgeSec: number): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const ts = Number.parseInt(parts[1] ?? '', 10);
  if (!Number.isFinite(ts)) return null;
  return ts + maxAgeSec;
}
