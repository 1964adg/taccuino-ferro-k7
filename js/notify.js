// Notifiche locali a fine recupero (senza server).
// Su iPhone funzionano solo con l'app aggiunta alla Home (iOS 16.4 e successivi)
// e solo mentre l'app è in primo piano: con lo schermo bloccato o l'app in
// background iOS sospende il JavaScript, e per quello serve il server (push).

import { get, t } from './config.js';

const TAG = 'gaia-gym-rest';

/** L'app gira come app installata (aggiunta alla Home)? */
export function isStandalone() {
  return !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
}

export const supported = () => 'Notification' in window && 'serviceWorker' in navigator;

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function permission() {
  return supported() ? Notification.permission : 'unsupported';
}

/**
 * Chiede il permesso. Va chiamata direttamente dal gestore del tocco,
 * senza await prima: iOS mostra la richiesta solo dentro un gesto.
 */
export async function requestPermission() {
  if (!supported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function registration() {
  try {
    // ready non si risolve mai senza service worker: si aspetta al massimo un attimo
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((r) => setTimeout(() => r(null), 1500)),
    ]);
  } catch {
    return null;
  }
}

/** Mostra una notifica. Restituisce true se è stata consegnata al sistema. */
export async function show(title, body) {
  if (permission() !== 'granted') return false;
  const options = {
    body,
    tag: TAG,
    renotify: true,      // la stessa etichetta riproduce comunque suono e vibrazione
    silent: false,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: './#/workout' },
  };
  const reg = await registration();
  try {
    if (reg && reg.showNotification) {
      await reg.showNotification(title, options);
      return true;
    }
    // Senza service worker (es. prove in locale senza HTTPS)
    new Notification(title, options); // eslint-disable-line no-new
    return true;
  } catch (err) {
    console.warn('Notifica non mostrata', err);
    return false;
  }
}

/** Le notifiche locali di fine recupero sono attive e permesse? */
export const restNotifyActive = () => !!get('notify.local') && permission() === 'granted';

/**
 * Fine recupero. late = secondi di ritardo con cui l'app se ne accorge
 * (es. tornando dal background): oltre la soglia la notifica non serve più.
 */
export function restEnded({ exercise, setNumber, allDone }, late = 0) {
  if (!restNotifyActive()) return false;
  if (late > get('notify.maxLateSec')) return false;
  const body = allDone ? t('notifyBodyAllDone') : t('notifyBody', { exercise: exercise || '', n: setNumber || '' });
  show(t('notifyTitle'), body);
  return true;
}

/** Notifica di prova, subito o dopo qualche secondo. */
export function test(delaySec = 0) {
  const fire = () => show(t('notifyTestTitle'), t('notifyTestBody'));
  if (delaySec > 0) setTimeout(fire, delaySec * 1000);
  else return fire();
  return Promise.resolve(true);
}
