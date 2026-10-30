// Strato di accesso ai dati: è l'UNICO modulo che parla con IndexedDB.
// Per passare a un altro sistema di salvataggio basta riscrivere questo file
// mantenendo le stesse funzioni esportate.

const DB_NAME = 'gaia-gym';
const IDB_VERSION = 1;

/** Versione dello schema dei dati applicativi (diversa dalla versione IndexedDB). */
export const SCHEMA_VERSION = 1;

export const STORES = {
  settings: 'settings',     // { id: 'user', values: {...} }
  meta: 'meta',             // { key, value }
  exercises: 'exercises',   // libreria esercizi
  programs: 'programs',     // schede con giorni e voci annidati
  sessions: 'sessions',     // allenamenti conclusi, con le serie annidate
  active: 'active',         // allenamento in corso { id: 'current', ... }
  bodyweight: 'bodyweight', // { id, date, kg }
};

/** Errore con un codice leggibile dall'interfaccia. */
export class DataError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.code = code; // 'quota' | 'unavailable' | 'generic'
    this.cause = cause;
  }
}

function wrapError(err) {
  if (err instanceof DataError) return err;
  const name = err && err.name;
  if (name === 'QuotaExceededError') return new DataError('quota', 'Spazio esaurito', err);
  return new DataError('generic', (err && err.message) || String(err), err);
}

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new DataError('unavailable', 'IndexedDB non disponibile'));
      return;
    }
    const req = indexedDB.open(DB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      // Versione 1: struttura iniziale
      if (e.oldVersion < 1) {
        db.createObjectStore(STORES.settings, { keyPath: 'id' });
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
        db.createObjectStore(STORES.exercises, { keyPath: 'id' });
        db.createObjectStore(STORES.programs, { keyPath: 'id' });
        const s = db.createObjectStore(STORES.sessions, { keyPath: 'id' });
        s.createIndex('startedAt', 'startedAt');
        db.createObjectStore(STORES.active, { keyPath: 'id' });
        const b = db.createObjectStore(STORES.bodyweight, { keyPath: 'id' });
        b.createIndex('date', 'date');
      }
      // Versioni future: aggiungere qui i blocchi "if (e.oldVersion < N)".
    };
    req.onsuccess = () => {
      const db = req.result;
      // Se un'altra scheda aggiorna il database, chiudiamo questa connessione
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(wrapError(req.error));
    req.onblocked = () => reject(new DataError('generic', 'Database bloccato da un\'altra finestra aperta'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(wrapError(req.error));
  });
}

async function withStore(storeNames, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(storeNames, mode);
    } catch (err) {
      reject(wrapError(err));
      return;
    }
    let work;
    try { work = Promise.resolve(fn(tx)); } catch (err) { work = Promise.reject(err); }
    // Il risultato si consegna solo a transazione completata (dati davvero scritti)
    tx.oncomplete = () => work.then(resolve, (err) => reject(wrapError(err)));
    tx.onerror = () => reject(wrapError(tx.error));
    tx.onabort = () => reject(wrapError(tx.error || new Error('Transazione annullata')));
    work.catch((err) => {
      try { tx.abort(); } catch { /* già chiusa */ }
      reject(wrapError(err));
    });
  });
}

// ---- Operazioni generiche ----

export function get(store, key) {
  return withStore(store, 'readonly', (tx) => promisify(tx.objectStore(store).get(key)));
}

export function getAll(store) {
  return withStore(store, 'readonly', (tx) => promisify(tx.objectStore(store).getAll()));
}

export function put(store, value) {
  return withStore(store, 'readwrite', (tx) => promisify(tx.objectStore(store).put(value)));
}

export function putMany(store, values) {
  return withStore(store, 'readwrite', (tx) => {
    const os = tx.objectStore(store);
    values.forEach((v) => os.put(v));
  });
}

export function remove(store, key) {
  return withStore(store, 'readwrite', (tx) => promisify(tx.objectStore(store).delete(key)));
}

export function clearStore(store) {
  return withStore(store, 'readwrite', (tx) => promisify(tx.objectStore(store).clear()));
}

/** Cancella tutto il contenuto di tutti gli archivi. */
export function wipeAll() {
  const names = Object.values(STORES);
  return withStore(names, 'readwrite', (tx) => {
    names.forEach((n) => tx.objectStore(n).clear());
  });
}

/** Legge tutto (per backup ed esportazione). */
export async function dumpAll() {
  const out = {};
  for (const name of Object.values(STORES)) out[name] = await getAll(name);
  return out;
}

/**
 * Sostituisce il contenuto degli archivi indicati in UNA transazione:
 * se qualcosa va storto non resta nulla a metà.
 * @param {object} data  { nomeArchivio: [record, ...] }
 * @param {object} o     keepMeta: chiavi di meta da conservare
 */
export async function replaceAll(data, { keepMeta = [] } = {}) {
  const names = Object.values(STORES);
  // Le chiavi da conservare si leggono prima, fuori dalla transazione di scrittura
  const kept = [];
  for (const key of keepMeta) {
    const rec = await get(STORES.meta, key);
    if (rec) kept.push(rec);
  }
  return withStore(names, 'readwrite', (tx) => {
    for (const n of names) {
      const os = tx.objectStore(n);
      os.clear();
      for (const rec of data[n] || []) os.put(rec);
    }
    const metaStore = tx.objectStore(STORES.meta);
    kept.forEach((rec) => metaStore.put(rec));
  });
}

// ---- Metadati ----

export async function getMeta(key, fallback = null) {
  const rec = await get(STORES.meta, key);
  return rec ? rec.value : fallback;
}

export function setMeta(key, value) {
  return put(STORES.meta, { key, value });
}

// ---- Migrazioni dello schema applicativo ----
// Ogni funzione trasforma i dati (formato { archivio: [record] }) dalla versione N-1
// alla versione N. Sono funzioni pure: valgono sia per il database sia per i file
// di backup importati da una versione precedente dell'app.
const MIGRATIONS = {
  // 2: (data) => { data.sessions.forEach((s) => { s.nuovoCampo ??= null; }); return data; },
};

/** Porta i dati dalla versione "from" a SCHEMA_VERSION. */
export function migrateData(data, from) {
  let out = data;
  for (let v = from + 1; v <= SCHEMA_VERSION; v++) {
    if (MIGRATIONS[v]) out = MIGRATIONS[v](out) || out;
  }
  return out;
}

/** Apre il database e applica le migrazioni mancanti. */
export async function init() {
  await open();
  const version = await getMeta('schemaVersion', 0);
  if (version === 0) {
    await setMeta('schemaVersion', SCHEMA_VERSION);
    return { fresh: true };
  }
  if (version < SCHEMA_VERSION) {
    const data = migrateData(await dumpAll(), version);
    data.meta = (data.meta || []).filter((m) => m.key !== 'schemaVersion');
    data.meta.push({ key: 'schemaVersion', value: SCHEMA_VERSION });
    await replaceAll(data);
  }
  return { fresh: false };
}
