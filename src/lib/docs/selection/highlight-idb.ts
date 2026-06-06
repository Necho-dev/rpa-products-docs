export type HighlightColor = 'yellow' | 'green' | 'blue';

export type DocHighlight = {
  id: string;
  pagePath: string;
  exact: string;
  prefix: string;
  suffix: string;
  color: HighlightColor;
  createdAt: number;
};

const DB_NAME = 'docus-doc-highlights';
const DB_VERSION = 1;
const STORE = 'highlights';
/** 全站划线总量上限，超出时删除最旧记录 */
const MAX_HIGHLIGHTS = 500;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('pagePath', 'pagePath', { unique: false });
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

export async function idbListHighlightsForPage(pagePath: string): Promise<DocHighlight[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('pagePath');
    const result = await reqToPromise(index.getAll(pagePath));
    await txDone(tx);
    return (result as DocHighlight[]).sort((a, b) => a.createdAt - b.createdAt);
  } finally {
    db.close();
  }
}

async function idbListAllHighlights(): Promise<DocHighlight[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const result = await reqToPromise(tx.objectStore(STORE).getAll());
    await txDone(tx);
    return (result as DocHighlight[]).sort((a, b) => a.createdAt - b.createdAt);
  } finally {
    db.close();
  }
}

async function trimOldHighlights(): Promise<void> {
  const all = await idbListAllHighlights();
  if (all.length <= MAX_HIGHLIGHTS) return;

  const drop = all.slice(0, all.length - MAX_HIGHLIGHTS);
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const h of drop) store.delete(h.id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function idbPutHighlight(highlight: DocHighlight): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(highlight);
    await txDone(tx);
  } finally {
    db.close();
  }
  await trimOldHighlights();
}

export async function idbDeleteHighlight(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function idbGetHighlightById(id: string): Promise<DocHighlight | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const result = await reqToPromise(tx.objectStore(STORE).get(id));
    await txDone(tx);
    return (result as DocHighlight | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function idbFindHighlightByQuote(
  pagePath: string,
  exact: string,
  prefix: string,
  suffix: string,
): Promise<DocHighlight | null> {
  const list = await idbListHighlightsForPage(pagePath);
  return (
    list.find((h) => h.exact === exact && h.prefix === prefix && h.suffix === suffix) ?? null
  );
}

export function createHighlight(input: Omit<DocHighlight, 'id' | 'createdAt'>): DocHighlight {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
}
