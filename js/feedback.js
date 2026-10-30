// Suoni, feedback tattile e blocco dello spegnimento schermo.
// Ogni funzione degrada in silenzio se l'API non è disponibile.

import { get } from './config.js';

// ---- Suono (Web Audio, nessun file esterno) ----

// Su iPhone il canale audio dell'app viene "interrotto" quando parte un'altra
// app audio (Musica, Spotify, una chiamata) o quando l'app va in background.
// Dopo un'interruzione il canale a volte dice di funzionare ma resta muto:
// per questo lo si ricrea da capo al tocco successivo.

let ctx = null;
let needsRebuild = false;

function setSessionType() {
  try {
    // Safari 16.4+: "ambient" si mescola alla musica (e rispetta il silenzioso),
    // "playback" suona anche col silenzioso ma abbassa o ferma la musica
    if (navigator.audioSession) navigator.audioSession.type = get('timer.audioMode') === 'playback' ? 'playback' : 'ambient';
  } catch { /* non supportato */ }
}

function createCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  setSessionType();
  const c = new AC();
  c.onstatechange = () => {
    // "interrupted" esiste solo su Safari; "suspended" arriva anche con l'app in background
    if (c.state === 'interrupted' || c.state === 'suspended') needsRebuild = true;
  };
  needsRebuild = false;
  return c;
}

function audioCtx() {
  if (!ctx || ctx.state === 'closed') ctx = createCtx();
  return ctx;
}

/** Un suono muto: "accende" il canale dentro il gesto dell'utente (requisito di iOS). */
function primeSilently(c) {
  try {
    const buf = c.createBuffer(1, 1, c.sampleRate || 44100);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  } catch { /* ignorato */ }
}

/**
 * Va chiamata a ogni tocco: riattiva il canale audio e, se era stato
 * interrotto da un'altra app, lo ricrea da capo.
 */
export function unlockAudio() {
  if (ctx && (needsRebuild || ctx.state === 'interrupted')) {
    const old = ctx;
    ctx = null;
    old.close().catch(() => {});
  }
  const c = audioCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  primeSilently(c);
}

// Tornando all'app si prova subito a riattivare l'audio (senza tocco può non riuscire:
// in quel caso ci pensa il primo tocco successivo)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') {
    ctx.resume().catch(() => { needsRebuild = true; });
  }
});

function tone(c, freq, start, dur, vol) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// Sequenze di note: [frequenza Hz, inizio s, durata s]
const PATTERNS = {
  warn: [[880, 0, 0.12]],
  tick: [[1046, 0, 0.09]],
  end: [[880, 0, 0.16], [1175, 0.2, 0.16], [1568, 0.4, 0.3]],
  done: [[660, 0, 0.08]],
  record: [[784, 0, 0.12], [988, 0.12, 0.12], [1319, 0.24, 0.25]],
};

export function playSound(kind) {
  if (!get('timer.sound')) return;
  const c = audioCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  const vol = Math.max(0.0002, Math.min(1, get('timer.soundVolume')));
  const t0 = c.currentTime + 0.01;
  for (const [f, s, d] of PATTERNS[kind] || []) tone(c, f, t0 + s, d, vol);
}

// ---- Vibrazione ----
// iOS non concede la vibrazione alle app web (provato anche il trucco dello
// switch di iOS 18: non funziona nelle app aggiunte alla Home). Qui si usa
// navigator.vibrate solo dove esiste (es. Android); su iPhone non fa nulla.

export function haptic(count = 1) {
  if (!navigator.vibrate) return;
  try { navigator.vibrate(count > 1 ? Array(count * 2 - 1).fill(40) : 30); } catch { /* ignorato */ }
}

// ---- Lampeggio a tutto schermo ----
// Un livello che non intercetta i tocchi, animato con le Web Animations
// (non toccate dalla regola CSS sul movimento ridotto, che qui si gestisce a parte).

let flashEl = null;

export function flashScreen() {
  if (!get('timer.flash')) return;
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.className = 'screen-flash';
    flashEl.setAttribute('aria-hidden', 'true');
    document.body.append(flashEl);
  }
  if (typeof flashEl.animate !== 'function') return;
  flashEl.getAnimations().forEach((a) => a.cancel());
  const count = Math.max(1, Math.round(get('timer.flashCount')));
  const ms = Math.max(50, get('timer.flashMs'));
  const op = Math.max(0, Math.min(1, get('timer.flashOpacity')));
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    // Movimento ridotto: un solo cambio di colore morbido, più tenue, della stessa durata totale
    const soft = op * 0.6;
    flashEl.animate([{ opacity: 0 }, { opacity: soft, offset: 0.25 }, { opacity: soft, offset: 0.7 }, { opacity: 0 }],
      { duration: count * ms, easing: 'ease-in-out' });
  } else {
    flashEl.animate([{ opacity: 0 }, { opacity: op, offset: 0.3 }, { opacity: 0 }],
      { duration: ms, iterations: count, easing: 'ease-out' });
  }
}

// ---- Schermo sempre acceso (Wake Lock API) ----

let lock = null;
let wanted = false;

async function acquire() {
  if (!wanted || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch { /* negato o non disponibile: nessun problema */ }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && !lock) acquire();
});

export function keepScreenOn(on) {
  wanted = on && get('timer.keepScreenOn');
  if (wanted) acquire();
  else if (lock) { lock.release().catch(() => {}); lock = null; }
}

export const wakeLockSupported = () => 'wakeLock' in navigator;
