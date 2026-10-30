// Pittogrammi degli esercizi: figure stilizzate disegnate a mano in SVG (griglia 48×48),
// nello stesso stile delle icone dell'app. Nessuna immagine esterna, nessuna licenza.
// Ogni esercizio può avere: un pittogramma scelto, "auto" (scelto dal nome o dal gruppo
// muscolare con le regole di config-default.js), "none", oppure una foto dalla galleria.

import { get, t } from '../config.js';

// Testa piena (cerchio) + tratti. H = testa.
const H = (cx, cy, r = 4) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;
const L = (...p) => `<polyline points="${p.join(' ')}"/>`;

export const PICTOGRAMS = {
  pullup: H(24, 14) + L('6,6 42,6') + L('17,6 21,20') + L('31,6 27,20') + L('24,19 24,32') + L('24,32 20,43') + L('24,32 28,43'),
  bench: L('8,34 40,34') + L('12,34 12,42') + L('36,34 36,42') + H(11, 28, 3.5) + L('15,30 30,30') + L('30,30 37,33 37,42')
    + L('19,30 19,18') + L('9,17 29,17') + L('9,12 9,22') + L('29,12 29,22'),
  squat: H(24, 7) + L('11,14 37,14') + L('11,9 11,19') + L('37,9 37,19') + L('24,15 21,27') + L('21,27 31,30 28,42')
    + L('24,17 17,14') + L('24,42 33,42'),
  deadlift: H(13, 14) + L('16,18 29,23') + L('29,23 27,33 29,42') + L('18,19 20,33') + `<circle cx="20" cy="36" r="6"/>` + L('8,42 40,42'),
  row: H(9, 17) + L('13,19 32,21') + L('32,21 29,32 31,42') + L('32,21 37,31 37,42') + L('17,20 17,30')
    + L('11,31 23,31') + L('11,27 11,35') + L('23,27 23,35') + L('27,36 27,25') + L('24,28 27,25 30,28'),
  press: H(24, 15) + L('8,6 40,6') + L('8,2 8,10') + L('40,2 40,10') + L('24,20 17,15 17,6') + L('24,20 31,15 31,6')
    + L('24,20 24,32') + L('24,32 20,43') + L('24,32 28,43'),
  curl: H(22, 9) + L('22,14 22,29') + L('22,29 19,42') + L('22,29 25,42') + L('22,16 25,25 32,19') + L('32,14 32,24') + L('29,14 35,14'),
  pushdown: L('40,4 40,44') + L('36,6 40,6') + L('40,6 31,26') + H(21, 9) + L('21,14 21,29') + L('21,29 18,42') + L('21,29 24,42')
    + L('21,16 24,24 31,27'),
  legpress: L('8,38 30,38') + L('8,38 12,24') + H(12, 19, 3.5) + L('13,24 20,34') + L('20,34 30,24 38,16') + L('34,11 42,21'),
  legmachine: L('10,30 26,30') + L('10,30 10,14') + L('10,30 10,40') + L('26,30 26,40') + H(15, 10) + L('15,15 16,29')
    + L('16,29 28,29 36,22') + `<circle cx="37.5" cy="20.5" r="2.5"/>`,
  calf: L('14,38 34,38 34,44') + H(24, 7) + L('24,12 24,27') + L('24,27 22,36') + L('24,27 26,36') + L('22,36 19,38') + L('26,36 29,38')
    + L('40,30 40,18') + L('36,22 40,18 44,22'),
  plank: L('4,38 44,38') + H(9, 25) + L('13,27 38,33') + L('38,33 42,37') + L('15,28 15,37 21,37'),
  crunch: L('4,40 44,40') + L('24,38 32,28 40,38') + L('24,38 16,28') + H(13, 23) + L('17,27 21,22'),
  dip: L('6,24 42,24') + L('10,24 10,44') + L('38,24 38,44') + H(24, 10) + L('24,15 24,30') + L('24,17 19,21 20,24')
    + L('24,17 29,21 28,24') + L('24,30 22,38 28,42'),
  fly: H(24, 10) + L('24,15 24,30') + L('24,30 20,42') + L('24,30 28,42') + L('24,18 10,16') + L('24,18 38,16')
    + L('8,12 8,20') + L('40,12 40,20') + L('4,4 8,14') + L('44,4 40,14'),
  lunge: H(22, 8) + L('22,13 22,26') + L('22,26 31,31 31,41') + L('22,26 16,34 10,40') + L('22,16 26,24') + L('6,42 36,42'),
  run: H(27, 9) + L('25,14 21,27') + L('21,27 28,32 26,41') + L('21,27 15,33 9,30') + L('24,17 30,22 34,17') + L('24,17 17,20 15,25'),
  bike: `<circle cx="12" cy="34" r="7"/>` + `<circle cx="36" cy="34" r="7"/>` + L('12,34 22,34 30,22 36,34') + L('30,22 33,18')
    + H(25, 8, 3.5) + L('24,12 20,22') + L('20,22 26,28 22,34') + L('23,15 31,20'),
  kettlebell: `<circle cx="24" cy="31" r="11"/>` + `<path d="M16 23 C14 8, 34 8, 32 23"/>`,
  stretch: H(20, 8) + L('20,13 22,28') + L('22,28 18,42') + L('22,28 28,42') + L('20,16 10,8') + L('20,16 34,20 42,24'),
  dumbbell: L('8,24 40,24') + L('11,16 11,32') + L('15,18 15,30') + L('37,16 37,32') + L('33,18 33,30'),
};

export const PICTOGRAM_KEYS = Object.keys(PICTOGRAMS);

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Pittogramma scelto in automatico: prima le parole del nome, poi il gruppo muscolare. */
export function autoPictogram(ex) {
  const name = norm(ex && ex.name);
  for (const rule of get('exerciseIcons.rules')) {
    if (rule.exclude && rule.exclude.some((w) => name.includes(norm(w)))) continue;
    if (rule.match.some((w) => name.includes(norm(w)))) return rule.icon;
  }
  const groups = get('exerciseIcons.groups');
  const g = norm(ex && ex.muscleGroup);
  for (const [key, icon] of Object.entries(groups)) if (g && g.includes(norm(key))) return icon;
  return get('exerciseIcons.fallback');
}

/** Cosa mostrare per l'esercizio: { kind: 'image' | 'picto' | 'none', value }. */
export function resolveIcon(ex) {
  if (!ex) return { kind: 'none' };
  if (ex.icon === 'none') return { kind: 'none' };
  if (ex.icon === 'image' && ex.image) return { kind: 'image', value: ex.image };
  if (ex.icon && PICTOGRAMS[ex.icon]) return { kind: 'picto', value: ex.icon };
  return { kind: 'picto', value: autoPictogram(ex) };
}

/** SVG di un pittogramma (solo contenuto statico disegnato qui). */
export function pictogramSvg(key) {
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PICTOGRAMS[key] || PICTOGRAMS.dumbbell}</svg>`;
}

/**
 * Riquadro con l'icona dell'esercizio.
 * @param {object} ex  esercizio
 * @param {string} size  'sm' | 'md' | 'lg'
 * @returns {HTMLElement|null}  null se le icone sono disattivate o l'esercizio non ne ha
 */
export function exerciseIcon(ex, size = 'md', { force = false } = {}) {
  if (!force && !get('exerciseIcons.show')) return null;
  const r = resolveIcon(ex);
  if (r.kind === 'none') return null;
  const box = document.createElement('span');
  box.className = `ex-icon ex-icon-${size}`;
  box.setAttribute('aria-hidden', 'true');
  if (r.kind === 'image') {
    const img = document.createElement('img');
    img.src = r.value;
    img.alt = '';
    img.loading = 'lazy';
    box.append(img);
    box.classList.add('ex-icon-photo');
  } else {
    box.innerHTML = pictogramSvg(r.value);
  }
  return box;
}

export const pictogramLabel = (key) => t('picto_' + key);

// ---- Foto dalla galleria ----

/** Riduce una foto a un quadrato piccolo (JPEG), così pesa pochi KB nel database e nei backup. */
export function imageFileToIcon(file) {
  const size = get('exerciseIcons.photoSize');
  const quality = get('exerciseIcons.photoQuality');
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const c2d = canvas.getContext('2d');
      c2d.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('photoError'))); };
    img.src = url;
  });
}
