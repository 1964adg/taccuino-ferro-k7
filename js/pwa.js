// Registrazione del service worker e gestione degli aggiornamenti.
// Una nuova versione non si installa da sola: compare un avviso con "Aggiorna",
// così l'app non si ricarica a metà allenamento.

import { t } from './config.js';
import { toast } from './ui/components.js';

let registration = null;
let reloading = false;

/**
 * Versione installata, chiesta al service worker (il numero sta in service-worker.js).
 * Restituisce null se non è disponibile (es. prima installazione o sito senza HTTPS).
 */
export function appVersion() {
  return new Promise((resolve) => {
    const c = swSupported() && navigator.serviceWorker.controller;
    if (!c) { resolve(null); return; }
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 1500);
    ch.port1.onmessage = (e) => { clearTimeout(timer); resolve((e.data && e.data.version) || null); };
    c.postMessage('getVersion', [ch.port2]);
  });
}
export const swSupported = () => 'serviceWorker' in navigator;

function offerUpdate(worker) {
  toast(t('updateAvailable'), {
    duration: 0, // resta finché non si sceglie
    actionLabel: t('updateNow'),
    onAction: () => worker.postMessage('skipWaiting'),
  });
}

function watch(reg) {
  if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    if (!w) return;
    w.addEventListener('statechange', () => {
      // "installed" con un controller già attivo = è una versione nuova, non la prima installazione
      if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
    });
  });
}

export async function registerServiceWorker() {
  if (!swSupported()) return null;
  // Funziona solo in HTTPS (o su localhost): altrove si ignora in silenzio
  if (!window.isSecureContext) return null;
  try {
    // updateViaCache 'none': per controllare gli aggiornamenti il telefono scarica sempre
    // service-worker.js dalla rete, senza usare la memoria temporanea del browser
    // (GitHub Pages dice di tenere i file per 10 minuti).
    registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './', updateViaCache: 'none' });
  } catch (err) {
    console.warn('Service worker non registrato', err);
    return null;
  }
  watch(registration);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  // Quando si torna all'app si controlla se c'è una versione nuova
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && registration) registration.update().catch(() => {});
  });
  return registration;
}

/** Controllo manuale (dalle Impostazioni). Restituisce 'updating' | 'latest' | 'unavailable'. */
export async function checkForUpdate() {
  if (!registration) return 'unavailable';
  try { await registration.update(); } catch { return 'unavailable'; }
  const w = registration.installing || registration.waiting;
  if (w) {
    if (w.state === 'installed') offerUpdate(w);
    return 'updating';
  }
  return 'latest';
}

/** L'app è salvata per l'uso offline? */
export const offlineReady = () => !!(swSupported() && navigator.serviceWorker.controller);
