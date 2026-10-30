// Registrazione del service worker e gestione degli aggiornamenti.
// Una nuova versione non si installa da sola: compare un avviso con "Aggiorna",
// così l'app non si ricarica a metà allenamento.

import { t } from './config.js';
import { toast } from './ui/components.js';

let registration = null;
let reloading = false;

export const appVersion = () => self.APP_VERSION || '?';
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
    registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
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
