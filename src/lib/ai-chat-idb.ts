import type { InkeepUIMessage } from '@/lib/ai-chat-types';

const DB_NAME = 'docus-ai-chat';
const DB_VERSION = 1;

const STORE_SESSIONS = 'sessions';
const STORE_KV = 'kv';

export type StoredChatSession = {
  id: string;
  /** 列表展示：通常取首条用户消息摘要 */
  title: string;
  updatedAt: number;
  messages: InkeepUIMessage[];
};

const KV_ACTIVE = 'activeSessionId';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV);
      }
    };
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction aborted'));
  });
}

export async function idbGetActiveSessionId(): Promise<string | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_KV, 'readonly');
    const raw = await reqToPromise(tx.objectStore(STORE_KV).get(KV_ACTIVE));
    return typeof raw === 'string' ? raw : null;
  } finally {
    db.close();
  }
}

export async function idbSetActiveSessionId(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_KV, 'readwrite');
    tx.objectStore(STORE_KV).put(id, KV_ACTIVE);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function idbGetSession(id: string): Promise<StoredChatSession | undefined> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, 'readonly');
    return await reqToPromise(tx.objectStore(STORE_SESSIONS).get(id));
  } finally {
    db.close();
  }
}

export async function idbPutSession(session: StoredChatSession): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    tx.objectStore(STORE_SESSIONS).put(session);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export type SessionListItem = Pick<StoredChatSession, 'id' | 'title' | 'updatedAt'>;

export async function idbListSessions(): Promise<SessionListItem[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, 'readonly');
    const store = tx.objectStore(STORE_SESSIONS);
    const all = await reqToPromise(store.getAll() as IDBRequest<StoredChatSession[]>);
    return all
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function idbDeleteSession(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    tx.objectStore(STORE_SESSIONS).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const MAX_SESSIONS = 50;

async function trimOldSessions(): Promise<void> {
  const list = await idbListSessions();
  if (list.length <= MAX_SESSIONS) return;
  const drop = list.slice(MAX_SESSIONS);
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    const store = tx.objectStore(STORE_SESSIONS);
    for (const s of drop) store.delete(s.id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** 新建空会话并设为当前活跃 */
export async function idbCreateSession(): Promise<string> {
  await trimOldSessions();
  const id = randomId();
  const now = Date.now();
  await idbPutSession({
    id,
    title: '新对话',
    updatedAt: now,
    messages: [],
  });
  await idbSetActiveSessionId(id);
  return id;
}

/** 首次启动：恢复上次活跃会话；若无则使用最近一条；库为空则新建 */
export async function idbBootstrap(): Promise<{ activeId: string; messages: InkeepUIMessage[] }> {
  const active = await idbGetActiveSessionId();
  let rec = active ? await idbGetSession(active) : undefined;
  if (rec) {
    return { activeId: rec.id, messages: rec.messages ?? [] };
  }
  const list = await idbListSessions();
  if (list.length > 0) {
    const latest = list[0];
    await idbSetActiveSessionId(latest.id);
    const r = await idbGetSession(latest.id);
    if (r) return { activeId: r.id, messages: r.messages ?? [] };
  }
  const id = await idbCreateSession();
  const created = await idbGetSession(id);
  return { activeId: created!.id, messages: created!.messages ?? [] };
}

export function deriveTitleFromMessages(messages: InkeepUIMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.parts?.length) return '新对话';
  let text = '';
  for (const p of firstUser.parts) {
    if (p.type === 'text') text += p.text;
  }
  const t = text.trim();
  if (!t) return '新对话';
  const max = 48;
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** 列表展示：相对时间 + 过久则显示本地日期时间 */
export function formatChatSessionUpdatedAt(updatedAt: number): string {
  const d = new Date(updatedAt);
  const now = Date.now();
  const diff = Math.max(0, now - updatedAt);
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(d);
}
