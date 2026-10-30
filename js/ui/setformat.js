// Testi compatti per serie, obiettivi e record (es. "40 kg × 8–10").

import { t } from '../config.js';
import { measureOf } from '../domain/model.js';
import { formatClock, formatNumber, kgToDisplay, mToDisplay, weightUnit, distanceUnit } from '../format.js';

export function fmtReps(min, max) {
  if (min == null) return '';
  return max != null && max !== min ? `${min}–${max}` : String(min);
}

const w = (kg, plus) => `${plus ? '+' : ''}${formatNumber(kgToDisplay(kg))} ${weightUnit()}`;
const d = (m) => `${formatNumber(mToDisplay(m))} ${distanceUnit()}`;

/** Obiettivo di una serie, nello stesso ordine delle serie fatte. */
export function fmtTarget(tg, m) {
  const reps = m.fields.includes('reps') ? fmtReps(tg.repsMin, tg.repsMax) : '';
  if (m.fields.includes('weight') && tg.weightKg) {
    return reps ? `${w(tg.weightKg, m.bodyweight)} × ${reps}` : w(tg.weightKg, m.bodyweight);
  }
  if (reps) return `× ${reps}`;
  const parts = [];
  if (m.fields.includes('distance') && tg.distanceM) parts.push(d(tg.distanceM));
  if (m.fields.includes('duration') && tg.durationSec) parts.push(formatClock(tg.durationSec));
  return parts.join(' · ') || '—';
}

/** Serie eseguita. */
export function fmtSet(s, ex) {
  const m = measureOf(ex);
  if (m.fields.includes('weight') && m.fields.includes('reps')) {
    if (m.bodyweight) return (s.weightKg ? `${w(s.weightKg, true)} × ` : '× ') + (s.reps ?? 0);
    return `${w(s.weightKg || 0)} × ${s.reps ?? 0}`;
  }
  if (m.fields.includes('reps')) return `× ${s.reps ?? 0}`;
  if (m.fields.includes('distance')) return `${d(s.distanceM || 0)} · ${formatClock(s.durationSec || 0)}`;
  if (m.fields.includes('duration')) return formatClock(s.durationSec || 0);
  return '';
}

/** Miglior risultato di un esercizio. */
export function fmtBest(b, m) {
  if (!b.count) return '';
  if (m.fields.includes('weight') && b.maxWeightKg > 0) return `${w(b.maxWeightKg)} × ${b.maxWeightReps}`;
  if (m.fields.includes('reps')) return `× ${b.maxReps}`;
  if (m.fields.includes('distance')) return d(b.maxDistanceM);
  if (m.fields.includes('duration')) return formatClock(b.maxDurationSec);
  return '';
}

/** Riassunto di una voce di scheda: "4 serie · 60 kg × 8–10 · rec. 1:30". */
export function fmtItem(item, ex, restSec) {
  const m = measureOf(ex);
  const parts = [`${item.sets} ${t('sets').toLowerCase()}`, fmtTarget(item, m)];
  if (item.warmupSets) parts.push(`${item.warmupSets} ${t('warmup').toLowerCase()}`);
  if (restSec != null) parts.push(`${t('rest')} ${formatClock(restSec)}`);
  return parts.filter((p) => p && p !== '—').join(' · ');
}
