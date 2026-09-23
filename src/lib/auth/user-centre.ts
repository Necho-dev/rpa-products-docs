import {
  embedUserInfoCacheTtlMs,
  userCentreBaseUrl,
  userCentreTimeoutMs,
} from '@/lib/auth/auth-config';
import { isValidCubeOrigin } from '@/lib/auth/cube';
import { finishUserCentreLog, type UserCentreLogOutcome } from '@/lib/observability/user-centre-log';

export type UserCentreUserInfo = {
  userId?: string;
  userName?: string;
  name?: string;
  mobile?: string;
  email?: string;
  tenantId?: string;
  customerIdentify?: string;
  orgId?: string;
  cubeOrigin?: string;
};

export type NormalizedUserInfo = {
  u: string;
  s: string;
  cubeOrigin: string | null;
  raw: UserCentreUserInfo;
};

export type UserInfoByAuthParams = {
  ed: string;
  sh: string;
  sg: string;
  tm: string | number;
  isSaas?: boolean;
};

export type FetchUserInfoByAuthOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  cache?: boolean;
};

type CacheEntry = {
  exp: number;
  value: NormalizedUserInfo | null;
};

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 256;
const NEGATIVE_CACHE_TTL_MS = 2_000;

export function resetUserCentreCache(): void {
  cache.clear();
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** BaseURL + 接口路径, 自动清理末尾斜杠 */
export function userCentreApiUrl(path: string): string | null {
  const baseRaw = userCentreBaseUrl();
  if (!baseRaw) return null;
  const base = trimSlash(baseRaw);
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rel}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** 新接口在 `data.ext.cubeOrigin`, 值可能是 URL 字符串, 文档也标过 object */
function cubeOriginCandidatesFromExt(ext: unknown): unknown[] {
  const rec = asRecord(ext);
  if (!rec) return [];
  const raw = rec.cubeOrigin;
  if (typeof raw === 'string') return [raw];
  const nested = asRecord(raw);
  if (!nested) return [];
  return Object.values(nested);
}

function pickCubeOrigin(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = asNonEmptyString(candidate);
    if (!value) continue;
    try {
      const origin = new URL(value).origin;
      if (isValidCubeOrigin(origin)) return origin;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function normalizeUserInfo(
  data: unknown,
  extraInfo?: unknown,
): NormalizedUserInfo | null {
  const rec = asRecord(data);
  if (!rec) return null;
  const extra = asRecord(extraInfo);
  const userName = asNonEmptyString(rec.userName);
  const name = asNonEmptyString(rec.name);
  const customerIdentify = asNonEmptyString(rec.customerIdentify);
  const tenantId = asNonEmptyString(rec.tenantId);
  const orgId = asNonEmptyString(rec.orgId);
  const u = userName ?? name;
  const s = customerIdentify ?? tenantId ?? orgId;
  if (!u || !s) return null;
  const cubeOrigin = pickCubeOrigin(
    ...cubeOriginCandidatesFromExt(rec.ext),
    rec.cubeOrigin,
    extra?.cubeOrigin,
  );
  return {
    u,
    s,
    cubeOrigin,
    raw: {
      userId: asNonEmptyString(rec.userId) ?? undefined,
      userName: userName ?? undefined,
      name: name ?? undefined,
      mobile: asNonEmptyString(rec.mobile) ?? undefined,
      email: asNonEmptyString(rec.email) ?? undefined,
      customerIdentify: customerIdentify ?? undefined,
      tenantId: tenantId ?? undefined,
      orgId: orgId ?? undefined,
      cubeOrigin: cubeOrigin ?? undefined,
    },
  };
}

/** Query saas → UserCentre isSaas, 缺省默认 false */
export function parseSaasQuery(raw: string | null | undefined): boolean {
  return raw?.trim().toLowerCase() === 'true';
}

function cacheKey(params: UserInfoByAuthParams): string {
  const isSaas = params.isSaas ?? false;
  return `${params.ed}\n${params.sh}\n${params.sg}\n${params.tm}\n${isSaas}`;
}

function readCache(key: string): NormalizedUserInfo | null | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.exp <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeCache(key: string, value: NormalizedUserInfo | null, ttlMs: number): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value;
    if (typeof first === 'string') cache.delete(first);
  }
  cache.set(key, { exp: Date.now() + ttlMs, value });
}

/** 用户中心实际挂载路径 */
export const USER_INFO_BY_AUTH_PATH = '/open/oidc/userInfoByAuth';

function parseEnvelope(json: unknown): NormalizedUserInfo | null {
  const rec = asRecord(json);
  if (!rec) return null;
  if (rec.success === false) return null;
  return normalizeUserInfo(rec.data ?? rec, rec.extraInfo);
}

function envelopeSummary(json: unknown): {
  success: boolean | null;
  code: string | null;
  msg: string | null;
} {
  const rec = asRecord(json);
  if (!rec) return { success: null, code: null, msg: null };
  const msg = asNonEmptyString(rec.msg);
  return {
    success: typeof rec.success === 'boolean' ? rec.success : null,
    code: asNonEmptyString(rec.code),
    msg: msg ? msg.slice(0, 200) : null,
  };
}

function tmAgeMs(tm: string): number | undefined {
  const n = Number(tm);
  if (!Number.isFinite(n)) return undefined;
  return Math.abs(Date.now() - n);
}

function logUserCentre(
  outcome: UserCentreLogOutcome,
  started: number,
  extra: {
    http?: number;
    isSaas?: boolean;
    cache?: 'hit';
    success?: boolean | null;
    code?: string | null;
    msg?: string | null;
    tmAgeMs?: number;
    reason?: string;
  } = {},
): void {
  finishUserCentreLog({
    outcome,
    path: USER_INFO_BY_AUTH_PATH,
    durationMs: Date.now() - started,
    ...extra,
  });
}

/**
 * GET /open/oidc/userInfoByAuth
 * 若未配置 BaseURL, 或网络失败, 或 success=false, 均返回 NULL
 *
 * @param params - 请求参数
 * @param options - 请求选项
 * @returns 用户信息, 或 NULL
 */
export async function fetchUserInfoByAuth(
  params: UserInfoByAuthParams,
  options: FetchUserInfoByAuthOptions = {},
): Promise<NormalizedUserInfo | null> {
  const started = Date.now();
  const ed = params.ed.trim();
  const sh = params.sh.trim();
  const sg = params.sg.trim();
  const tm = String(params.tm).trim();
  if (!ed || !sh || !sg || !tm) {
    logUserCentre('skip', started, { reason: 'missing-pack' });
    return null;
  }

  const url = userCentreApiUrl(USER_INFO_BY_AUTH_PATH);
  if (!url) {
    logUserCentre('skip', started, { reason: 'no-base-url' });
    return null;
  }

  const isSaas = params.isSaas ?? false;
  const age = tmAgeMs(tm);
  const useCache = options.cache !== false;
  const key = cacheKey({ ed, sh, sg, tm, isSaas });
  if (useCache) {
    const cached = readCache(key);
    if (cached !== undefined) {
      logUserCentre(cached ? 'ok' : 'empty', started, {
        isSaas,
        cache: 'hit',
        tmAgeMs: age,
        reason: cached ? undefined : 'cached-null',
      });
      return cached;
    }
  }

  const target = new URL(url);
  target.searchParams.set('ed', ed);
  target.searchParams.set('sh', sh);
  target.searchParams.set('sg', sg);
  target.searchParams.set('tm', tm);
  target.searchParams.set('isSaas', isSaas ? 'true' : 'false');

  const timeoutMs = options.timeoutMs ?? userCentreTimeoutMs();
  const fetchImpl = options.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetchImpl(target, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ac.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = null;
      }
    }
    const summary = envelopeSummary(json);
    if (!res.ok) {
      logUserCentre('http', started, {
        http: res.status,
        isSaas,
        tmAgeMs: age,
        ...summary,
        reason: summary.msg ? undefined : 'http-error',
      });
      if (useCache) writeCache(key, null, NEGATIVE_CACHE_TTL_MS);
      return null;
    }
    const user = parseEnvelope(json);
    logUserCentre(user ? 'ok' : 'empty', started, {
      http: res.status,
      isSaas,
      tmAgeMs: age,
      ...summary,
      reason: user ? undefined : summary.success === false ? 'success-false' : 'missing-identity',
    });
    if (useCache) {
      writeCache(
        key,
        user,
        user ? embedUserInfoCacheTtlMs() : NEGATIVE_CACHE_TTL_MS,
      );
    }
    return user;
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    logUserCentre(aborted ? 'timeout' : 'network', started, {
      isSaas,
      tmAgeMs: age,
      reason: err instanceof Error ? err.name : 'error',
    });
    if (useCache) writeCache(key, null, NEGATIVE_CACHE_TTL_MS);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
