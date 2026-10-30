// Avvio dell'app: database, configurazione, dati, interfaccia.

import * as db from './db.js';
import { initConfig, t } from './config.js';
import * as repo from './domain/repo.js';
import { mountApp } from './ui/app.js';
import { unlockAudio } from './feedback.js';
import { registerServiceWorker } from './pwa.js';
import { periodicSnapshotIfDue } from './io.js';

async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      const granted = already || (await navigator.storage.persist());
      await db.setMeta('persisted', !!granted);
    }
  } catch { /* API non disponibile */ }
}

function preventZoom() {
  // iOS: blocca il pinch-zoom. Il doppio tocco è già disattivato
  // dal CSS (touch-action: manipulation) senza rallentare i tocchi rapidi su + e −.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

function showFatal(message) {
  const root = document.getElementById('app');
  root.textContent = '';
  const box = document.createElement('div');
  box.className = 'fatal';
  box.textContent = message;
  root.append(box);
  document.body.classList.remove('loading');
}

async function boot() {
  preventZoom();
  // Ogni tocco sblocca l'audio (requisito di iOS)
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  try {
    await db.init();
    await initConfig();
    await repo.loadAll();
    await repo.seedSampleIfNeeded();
    mountApp(document.getElementById('app'));
    document.body.classList.remove('loading');
    requestPersistence();
    registerServiceWorker();
    // Copia interna periodica, in sottofondo (non rallenta l'avvio)
    setTimeout(() => periodicSnapshotIfDue().catch((err) => console.warn(err)), 1500);
  } catch (err) {
    console.error(err);
    if (err && err.code === 'unavailable') showFatal(t('errNoIndexedDB'));
    else if (err && err.code === 'quota') showFatal(t('errStorageFull'));
    else showFatal(t('errGeneric', { msg: (err && err.message) || String(err) }));
  }
}

boot();
