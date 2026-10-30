// Conversioni di unità e formattazione di numeri, date e durate.
// I dati sono sempre salvati in kg, metri e secondi; si converte solo per mostrarli.

import { get } from './config.js';
import { roundTo } from './util.js';

const KG_PER_LB = 0.45359237;
const M_PER_MI = 1609.344;

// ---- Peso ----
export const weightUnit = () => get('units.weight');
export const kgToDisplay = (kg) => (weightUnit() === 'lb' ? kg / KG_PER_LB : kg);
export const displayToKg = (v) => (weightUnit() === 'lb' ? v * KG_PER_LB : v);

// ---- Distanza ----
export const distanceUnit = () => get('units.distance');
export const mToDisplay = (m) => (distanceUnit() === 'mi' ? m / M_PER_MI : m / 1000);
export const displayToM = (v) => (distanceUnit() === 'mi' ? v * M_PER_MI : v * 1000);

export function formatNumber(n, maxDecimals = 2) {
  if (n == null || !Number.isFinite(n)) return '–';
  return roundTo(n, maxDecimals).toLocaleString(get('app.locale'), { maximumFractionDigits: maxDecimals });
}

export function formatWeight(kg, withUnit = true) {
  const s = formatNumber(kgToDisplay(kg || 0), 2);
  return withUnit ? `${s} ${weightUnit()}` : s;
}

export function formatDistance(m, withUnit = true) {
  const s = formatNumber(mToDisplay(m || 0), 2);
  return withUnit ? `${s} ${distanceUnit()}` : s;
}

/** Volume grande in forma compatta (es. 12.450 kg). */
export function formatVolume(kg) {
  return `${formatNumber(kgToDisplay(kg || 0), 0)} ${weightUnit()}`;
}

// ---- Tempo ----

/** Secondi in m:ss (o h:mm:ss). */
export function formatClock(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Durata leggibile, es. "1 h 05 min" o "48 min". */
export function formatDuration(totalSec) {
  const min = Math.round((totalSec || 0) / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

// ---- Date ----
// Segnaposto: yyyy, yy, mmmm, mmm, mm, m, dddd, ddd, dd, d, HH, MM

export function formatDate(ts, fmt = get('dates.format')) {
  const d = new Date(ts);
  const names = get('dates');
  const map = {
    yyyy: String(d.getFullYear()),
    yy: String(d.getFullYear()).slice(-2),
    mmmm: names.monthNames[d.getMonth()],
    mmm: names.monthShort[d.getMonth()],
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    m: String(d.getMonth() + 1),
    dddd: names.weekdayNames[d.getDay()],
    ddd: names.weekdayShort[d.getDay()],
    dd: String(d.getDate()).padStart(2, '0'),
    d: String(d.getDate()),
    HH: String(d.getHours()).padStart(2, '0'),
    MM: String(d.getMinutes()).padStart(2, '0'),
  };
  return fmt.replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|HH|MM/g, (tok) => map[tok] ?? tok);
}

export function formatTime(ts) {
  return formatDate(ts, 'HH:MM');
}
