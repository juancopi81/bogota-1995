// Persistence. Small flags live in localStorage; audio lives in IndexedDB.
//
// Storage can be missing or blocked (private windows, previews, cleared site
// data), and the room must work without it, so every access is wrapped and
// failures fall back to "nothing saved".

const PREFIX = 'bogota1995:';

export const kv = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep going without it */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};

export type StoreName = 'tape' | 'songs' | 'voices';
const STORES: StoreName[] = ['tape', 'songs', 'voices'];

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open('bogota-1995', 1);
      request.onupgradeneeded = () => {
        for (const name of STORES) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const request = fn(db.transaction(store, mode).objectStore(store));
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export const idb = {
  get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return run<T>(store, 'readonly', (s) => s.get(key));
  },
  put(store: StoreName, key: string, value: unknown): Promise<void> {
    return run(store, 'readwrite', (s) => s.put(value, key)).then(() => undefined);
  },
  del(store: StoreName, key: string): Promise<void> {
    return run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined);
  },
  keys(store: StoreName): Promise<string[]> {
    return run<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys()).then((k) => (k ?? []).map(String));
  },
  clear(store: StoreName): Promise<void> {
    return run(store, 'readwrite', (s) => s.clear()).then(() => undefined);
  },
};
