/**
 * `POST /api/search/ai` 的简单进程内限流：滑动窗口计数，防止滥用拉高 LLM 账单。
 * 单实例部署场景够用；多实例一致性诉求可后续升级为共享存储（Redis 等）。
 */

const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

/** 定期清理长期不活跃的 key，避免内存无限增长 */
let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 5 * 60_000;

function sweep(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, timestamps] of buckets) {
    const fresh = timestamps.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

function getLimit(): number {
  const raw = Number(process.env.AI_SEARCH_RATE_LIMIT_PER_MIN);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 15;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

/** 按 key（用户标识或 IP）判断是否允许本次 AI 搜索请求；允许时会记录本次调用。 */
export function checkAiSearchRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const limit = getLimit();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= limit) {
    const retryAfterMs = WINDOW_MS - (now - timestamps[0]);
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true };
}

/** 从请求中推导限流 key：优先鉴权身份，其次来源 IP，最后统一兜底桶。 */
export function resolveAiSearchRateLimitKey(
  request: Request,
  identity: { userName?: string; secretHash?: string } | undefined,
): string {
  if (identity?.userName) return `user:${identity.userName}`;
  if (identity?.secretHash) return `secret:${identity.secretHash}`;

  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim();
  if (ip) return `ip:${ip}`;

  return 'anonymous';
}
