// Service worker: rende l'app utilizzabile offline salvando i file sul telefono.
// Strategia: prima la copia salvata (avvio istantaneo), poi la rete.
// Per pubblicare una nuova versione: aumentare APP_VERSION in version.js
// e, se si aggiungono o tolgono file, aggiornare l'elenco FILES qui sotto.

importScripts('./version.js');

const CACHE = 'gaia-gym-' + self.APP_VERSION;

// Tutti i file dell'app (percorsi relativi: il sito può stare in una sottocartella)
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './version.js',
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
  if (event.data === 'getVersion' && event.source) event.source.postMessage({ type: 'version', version: self.APP_VERSION });
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
