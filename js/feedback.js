// Suoni, feedback tattile e blocco dello spegnimento schermo.
// Ogni funzione degrada in silenzio se l'API non è disponibile.

import { get } from './config.js';

// ---- Suono (Web Audio, nessun file esterno) ----

let ctx = null;

function audioCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    // Safari 16.4+: decide se il suono si mescola alla musica o ignora il silenzioso
    if (navigator.audioSession) navigator.audioSession.type = get('timer.audioMode') === 'playback' ? 'playback' : 'ambient';
  } catch { /* non supportato */ }
  ctx = new AC();
  return ctx;
}

/** iOS sblocca l'audio solo dopo un gesto: va chiamata a ogni tocco. */
export function unlockAudio() {
  const c = audioCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

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
  end: [[880, 0, 0.16], [1175, 0.2, 0.16], [1568, 0.4, 0.3]],
  done: [[660, 0, 0.08]],
  record: [[784, 0, 0.12], [988, 0.12, 0.12], [1319, 0.24, 0.25]],
};

export function playSound(kind) {
  if (!get('timer.sound')) return;
  const c = audioCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const vol = Math.max(0.0002, Math.min(1, get('timer.soundVolume')));
  const t0 = c.currentTime + 0.01;
  for (const [f, s, d] of PATTERNS[kind] || []) tone(c, f, t0 + s, d, vol);
}

// ---- Feedback tattile ----
// Safari iOS non supporta navigator.vibrate. Da iOS 18 il tocco su un
// interruttore di sistema (<input type="checkbox" switch>) produce un "tic":
// lo simuliamo con un elemento nascosto. È un trucco non ufficiale.

let hapticLabel = null;

function hapticEl() {
  if (hapticLabel) return hapticLabel;
  const id = 'haptic-switch';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  const label = document.createElement('label');
  label.htmlFor = id;
  label.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div');
  box.className = 'haptic-host';
  box.append(input, label);
  document.body.append(box);
  hapticLabel = label;
  return label;
}

export function haptic(count = 1) {
  if (!get('timer.haptics')) return;
  if (navigator.vibrate) {
    navigator.vibrate(count > 1 ? Array(count * 2 - 1).fill(40) : 30);
    return;
  }
  const el = hapticEl();
  for (let i = 0; i < count; i++) setTimeout(() => el.click(), i * 120);
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
