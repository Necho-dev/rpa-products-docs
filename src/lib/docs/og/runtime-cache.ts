type CacheEntry = {
  body: Buffer;
  expiresAt: number;
};

const DEFAULT_MAX_ENTRIES = 200;

const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Buffer>>();

function evictIfNeeded(maxEntries: number): void {
  while (store.size >= maxEntries) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export async function getOrCreateOgPng(options: {
  key: string;
  ttlMs: number;
  maxEntries?: number;
  render: () => Promise<Buffer>;
}): Promise<Buffer> {
  const now = Date.now();
  const hit = store.get(options.key);
  if (hit && hit.expiresAt > now) {
    store.delete(options.key);
    store.set(options.key, hit);
    return hit.body;
  }

  const pending = inflight.get(options.key);
  if (pending) return pending;

  const task = options
    .render()
    .then((body) => {
      evictIfNeeded(options.maxEntries ?? DEFAULT_MAX_ENTRIES);
      store.set(options.key, { body, expiresAt: Date.now() + options.ttlMs });
      return body;
    })
    .finally(() => {
      inflight.delete(options.key);
    });

  inflight.set(options.key, task);
  return task;
}

export function ogCacheKey(parts: {
  variant: string;
  origin: string;
  pageUrl: string;
  fingerprint: string;
}): string {
  return `${parts.variant}\0${parts.origin}\0${parts.pageUrl}\0${parts.fingerprint}`;
}
