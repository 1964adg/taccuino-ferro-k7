// Service worker: rende l'app utilizzabile offline salvando i file sul telefono.
// Strategia: prima la copia salvata (avvio istantaneo), poi la rete.

// ===== VERSIONE DELL'APP: aumentarla a OGNI pubblicazione =====
// Safari capisce che c'è un aggiornamento solo se QUESTO file cambia:
// per questo il numero di versione sta qui e non in un file separato.
const APP_VERSION = '1.0.8';
// ===============================================================
// Se si aggiungono o tolgono file dell'app, aggiornare anche l'elenco FILES qui sotto
// (controllo: node tools/check-sw.mjs).

const CACHE = 'gaia-gym-' + APP_VERSION;

// Tutti i file dell'app (percorsi relativi: il sito può stare in una sottocartella)
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './js/config-default.js',
  './js/config.js',
  './js/db.js',
  './js/feedback.js',
  './js/format.js',
  './js/io.js',
  './js/main.js',
  './js/notify.js',
  './js/push.js',
  './js/pwa.js',
  './js/settings-schema.js',
  './js/timer.js',
  './js/util.js',
  './js/domain/history.js',
  './js/domain/model.js',
  './js/domain/programs.js',
  './js/domain/repo.js',
  './js/domain/stats.js',
  './js/domain/textImport.js',
  './js/domain/workout.js',
  './js/ui/app.js',
  './js/ui/charts.js',
  './js/ui/components.js',
  './js/ui/dom.js',
  './js/ui/editors.js',
  './js/ui/pictograms.js',
  './js/ui/setformat.js',
  './js/ui/sortable.js',
  './js/ui/views/body.js',
  './js/ui/views/exercise-progress.js',
  './js/ui/views/history.js',
  './js/ui/views/home.js',
  './js/ui/views/import.js',
  './js/ui/views/library.js',
  './js/ui/views/programs.js',
  './js/ui/views/progress-common.js',
  './js/ui/views/progress.js',
  './js/ui/views/settings.js',
  './js/ui/views/workout.js',
];

self.addEventListener('install', (event) => {
  // "reload" evita di copiare nella cache versioni vecchie tenute dal browser
  event.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
  // Non si attiva da solo: aspetta che l'utente tocchi "Aggiorna" (vedi main.js)
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('gaia-gym-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  // La pagina chiede la versione installata (risposta sul canale ricevuto)
  if (event.data === 'getVersion' && event.ports && event.ports[0]) event.ports[0].postMessage({ version: APP_VERSION });
});

// Push dal server di notifica: arriva VUOTA (il server non conosce i dati di allenamento).
// Il testo è la "nota" preparata dall'app in js/push.js. Su iOS ogni push deve
// mostrare una notifica, altrimenti Safari può revocare l'iscrizione.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let note = null;
    try {
      const res = await caches.match('./__push-note.json', { cacheName: 'gg-push-note' });
      if (res) note = await res.json();
    } catch { /* nota assente: testo generico */ }
    await self.registration.showNotification((note && note.title) || 'Gaia Gym', {
      body: (note && note.body) || '',
      tag: 'gaia-gym-rest',
      renotify: true,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: { url: './#/workout' },
    });
  })());
});

// Tocco sulla notifica: riporta all'app già aperta, altrimenti la apre sull'allenamento
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = list.find((c) => c.url.startsWith(self.registration.scope));
    if (client) {
      try { await client.focus(); return; } catch { /* non permesso: si apre una finestra */ }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Apertura dell'app (anche con #/indirizzi interni): sempre la pagina principale
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('./index.html', { ignoreSearch: true });
      if (cached) return cached;
      return fetch(req);
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // File non in elenco ma dello stesso sito: si salva per la prossima volta offline
      if (res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
