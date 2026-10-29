// Local storage on the phone (IndexedDB). Everything stays on the device unless the owner exports a backup
// or explicitly sends photos to the AI service.

const DB_NAME = 'limpieza-vitoria';
const DB_VERSION = 3; // 2: 'budgets' (quotations of the Calculadora de Limpieza y Presupuestos); 3: 'docs' (business documents)
const STORES = ['kv', 'customers', 'jobs', 'media', 'log', 'budgets', 'docs'];
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (db.objectStoreNames.contains(s)) continue;
        if (s === 'kv') db.createObjectStore(s);
        else {
          const os = db.createObjectStore(s, { keyPath: 'id' });
          if (s === 'media' || s === 'log') os.createIndex(s === 'media' ? 'jobId' : 'at', s === 'media' ? 'jobId' : 'at');
          if (s === 'jobs') os.createIndex('customerId', 'customerId');
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    Promise.resolve(fn(os)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('aborted'));
  }));
}

const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const db = {
  get: (store, key) => tx(store, 'readonly', (os) => reqP(os.get(key))),
  all: (store) => tx(store, 'readonly', (os) => reqP(os.getAll())),
  put: (store, value, key) => tx(store, 'readwrite', (os) => reqP(key === undefined ? os.put(value) : os.put(value, key))),
  del: (store, key) => tx(store, 'readwrite', (os) => reqP(os.delete(key))),
  clear: (store) => tx(store, 'readwrite', (os) => reqP(os.clear())),
  byIndex: (store, index, value) => tx(store, 'readonly', (os) => reqP(os.index(index).getAll(value))),
  async clearAll() { for (const s of STORES) await this.clear(s); },
  STORES,
};

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// Ask the browser not to evict our data when the phone is short of space.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch { /* not supported */ }
  return false;
}
