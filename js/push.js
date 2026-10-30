// Notifiche push dal server Cloudflare: servono quando l'app non è in primo piano
// (schermo bloccato, altra app). Il server riceve solo l'indirizzo push del telefono
// e il ritardo; la push arriva vuota e il testo lo compone il service worker
// leggendo la "nota" preparata qui (Cache API, nessun dato esce dal telefono).
//
// Regola d'oro: il timer del telefono resta il riferimento. Se il server non
// risponde o manca la rete, non si mostra nessun errore invasivo.

import { get, t } from './config.js';
import * as db from './db.js';
import { uid } from './util.js';

const NOTE_CACHE = 'gg-push-note';      // non inizia con "gaia-gym-": il service worker non la cancella
const NOTE_URL = './__push-note.json';
const KEY_META = 'pushPublicKey';

let lastResult = null;   // { ok, at, error } dell'ultimo invio, per le Impostazioni
let currentTimer = null; // id della sveglia in corso sul server

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window;

/** Server attivo e configurato nelle Impostazioni? */
export function configured() {
  return !!(get('push.enabled') && get('push.serverUrl').trim() && get('push.secret').trim());
}

export const getLastResult = () => lastResult;

function baseUrl() {
  return get('push.serverUrl').trim().replace(/\/+$/, '');
}

async function registration() {
  if (!supported()) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 1500))]);
}

/** Chiamata al server. Corpo JSON in text/plain: niente richiesta preliminare CORS. */
async function call(name, body = {}, { keepalive = false } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), get('push.timeoutMs'));
  try {
    const res = await fetch(`${baseUrl()}/api/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ ...body, segreto: get('push.secret').trim() }),
      signal: ctrl.signal,
      keepalive,
      cache: 'no-store',
    });
    let data = null;
    try { data = await res.json(); } catch { /* risposta non JSON */ }
    if (!res.ok || !data || !data.ok) {
      const err = new Error((data && data.errore) || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function remember(ok, error) {
  lastResult = { ok, at: Date.now(), error: error ? String(error.message || error) : null };
}

/**
 * Indirizzo della guida alla preparazione del server. Su GitHub Pages porta alla
 * pagina del repository, che GitHub mostra già impaginata; altrove al file accanto all'app.
 */
export function guideUrl() {
  const custom = get('push.guideUrl').trim();
  if (custom) return custom;
  const path = get('push.guidePath').replace(/^\/+/, '');
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  const repo = location.pathname.split('/').filter(Boolean)[0];
  if (m && repo && repo !== 'index.html') return `https://github.com/${m[1]}/${repo}/blob/${get('push.guideBranch')}/${path}`;
  return './' + path;
}

// ---------- Chiave pubblica e iscrizione ----------

export const savedPublicKey = () => db.getMeta(KEY_META, null);

/** Verifica il collegamento e salva la chiave pubblica del server. */
export async function fetchPublicKey() {
  const data = await call('chiave');
  await db.setMeta(KEY_META, data.chiavePubblica);
  return data.chiavePubblica;
}

function keyBytes(b64url) {
  const s = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** L'iscrizione è stata fatta con questa chiave pubblica? (se il server cambia chiavi va rifatta) */
export function sameKey(sub, b64url) {
  const k = sub && sub.options && sub.options.applicationServerKey;
  if (!k) return false;
  const a = new Uint8Array(k); const b = keyBytes(b64url);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export async function getSubscription() {
  const reg = await registration();
  if (!reg || !reg.pushManager) return null;
  try { return await reg.pushManager.getSubscription(); } catch { return null; }
}

/**
 * Collega il telefono (iscrizione push). Va chiamata dal tocco, con la chiave
 * pubblica già pronta, per non perdere il gesto su iOS.
 */
export async function subscribe(reg, publicKey) {
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, publicKey)) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  return sub;
}

export async function unsubscribe() {
  const sub = await getSubscription();
  if (!sub) return;
  try { await call('scollega', { endpoint: sub.endpoint }); } catch { /* il server dimentica da solo le iscrizioni scadute */ }
  await sub.unsubscribe();
}

export { registration };

// ---------- Nota per il service worker ----------

/** Testo che il service worker mostrerà all'arrivo della push. */
export async function saveNote(title, body) {
  try {
    const cache = await caches.open(NOTE_CACHE);
    await cache.put(NOTE_URL, new Response(JSON.stringify({ title, body, at: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
  } catch { /* Cache API non disponibile: il service worker usa un testo generico */ }
}

// ---------- Sveglie ----------

/**
 * Chiede al server una push tra ms millisecondi (inizio recupero, ±15 s).
 * Non lancia mai errori: in caso di problemi resta il timer locale.
 */
export async function schedule(ms, note, opts = {}) {
  if (!configured()) return false;
  try {
    const sub = await getSubscription();
    if (!sub) return false;
    if (note) await saveNote(note.title, note.body);
    const id = uid();
    currentTimer = id;
    await call('sveglia', { iscrizione: { endpoint: sub.endpoint }, traMs: Math.max(0, Math.round(ms)), idSveglia: id }, opts);
    remember(true);
    return true;
  } catch (err) {
    remember(false, err);
    return false;
  }
}

/** Annulla la sveglia sul server ("Salta", fine allenamento, app in primo piano a fine recupero). */
export async function cancel(opts = {}) {
  currentTimer = null;
  if (!configured()) return false;
  try {
    const sub = await getSubscription();
    if (!sub) return false;
    await call('annulla', { endpoint: sub.endpoint }, opts);
    remember(true);
    return true;
  } catch (err) {
    remember(false, err);
    return false;
  }
}

/** Prova dal server: push tra qualche secondo, anche a schermo bloccato. */
export async function test(delaySec) {
  const sub = await getSubscription();
  if (!sub) throw new Error(t('pushNotLinked'));
  await saveNote(t('notifyTestTitle'), t('pushTestBody'));
  await call('prova', { iscrizione: { endpoint: sub.endpoint }, traMs: delaySec * 1000 });
  remember(true);
}
