// Calcoli su serie e sessioni: volume, massimale stimato, record, ultima volta.

import { get } from '../config.js';
import * as repo from './repo.js';
import { measureOf } from './model.js';

/** Massimale stimato (1RM) con la formula scelta nelle impostazioni. */
export function e1rm(weightKg, reps) {
  if (!weightKg || !reps || reps < 1) return 0;
  if (reps === 1) return weightKg;
  if (get('stats.e1rm') === 'brzycki') {
    // Brzycki non è affidabile oltre ~36 ripetizioni
    return reps >= 37 ? weightKg : weightKg * 36 / (37 - reps);
  }
  return weightKg * (1 + reps / 30); // Epley
}

/** Peso corporeo noto alla data indicata (il più recente non successivo). */
export function bodyweightAt(ts) {
  const rec = repo.listBodyweight().find((b) => b.date <= ts);
  return rec ? rec.kg : null;
}

/** Carico effettivo di una serie (per gli esercizi a corpo libero include il peso corporeo). */
function loadOf(set, exercise, bodyweightKg) {
  const m = measureOf(exercise);
  let w = set.weightKg || 0;
  if (m.bodyweight && get('stats.bodyweightInVolume') && bodyweightKg) w += bodyweightKg;
  return w;
}

export function setVolume(set, exercise, bodyweightKg) {
  if (!set.done) return 0;
  if (set.warmup && !get('stats.warmupInVolume')) return 0;
  const m = measureOf(exercise);
  if (!m.fields.includes('reps')) return 0;
  return loadOf(set, exercise, bodyweightKg) * (set.reps || 0);
}

export function sessionBodyweight(session) {
  return session.bodyweightKg || bodyweightAt(session.startedAt || Date.now());
}

export function sessionSummary(session) {
  const bw = sessionBodyweight(session);
  let volume = 0;
  let setsDone = 0;
  const records = [];
  for (const entry of session.entries) {
    const ex = repo.getExercise(entry.exerciseId);
    for (const s of entry.sets) {
      if (!s.done) continue;
      setsDone++;
      volume += setVolume(s, ex, bw);
    }
    if (entry.sets.some((s) => s.pr)) records.push(entry.exerciseId);
  }
  const end = session.endedAt || Date.now();
  return {
    volume,
    setsDone,
    records,
    // La durata salvata (anche corretta a mano) ha la precedenza
    durationSec: Number.isFinite(session.durationSec) ? session.durationSec : Math.round((end - session.startedAt) / 1000),
  };
}

/** Serie dell'ultima sessione conclusa in cui compare l'esercizio. */
export function lastPerformance(exerciseId, excludeSessionId = null) {
  for (const s of repo.listSessions()) {
    if (s.id === excludeSessionId) continue;
    const sets = [];
    for (const e of s.entries) {
      if (e.exerciseId === exerciseId) sets.push(...e.sets.filter((x) => x.done));
    }
    if (sets.length) return { session: s, sets };
  }
  return null;
}

/** Record personali di un esercizio (serie di riscaldamento escluse). */
export function bests(exerciseId, { excludeSessionId = null, extraSets = [] } = {}) {
  const out = { maxWeightKg: 0, maxWeightReps: 0, bestE1rm: 0, maxReps: 0, maxDurationSec: 0, maxDistanceM: 0, count: 0 };
  const consider = (s) => {
    if (!s.done || s.warmup) return;
    out.count++;
    const w = s.weightKg || 0;
    const r = s.reps || 0;
    if (w > out.maxWeightKg || (w === out.maxWeightKg && r > out.maxWeightReps)) {
      out.maxWeightKg = w;
      out.maxWeightReps = r;
    }
    out.bestE1rm = Math.max(out.bestE1rm, e1rm(w, r));
    out.maxReps = Math.max(out.maxReps, r);
    out.maxDurationSec = Math.max(out.maxDurationSec, s.durationSec || 0);
    out.maxDistanceM = Math.max(out.maxDistanceM, s.distanceM || 0);
  };
  for (const sess of repo.listSessions()) {
    if (sess.id === excludeSessionId) continue;
    for (const e of sess.entries) if (e.exerciseId === exerciseId) e.sets.forEach(consider);
  }
  extraSets.forEach(consider);
  return out;
}

/** La serie batte i record precedenti? Serve almeno uno storico per parlare di record. */
export function isRecord(set, exercise, prev) {
  if (!set.done || set.warmup || prev.count === 0) return false;
  const m = measureOf(exercise);
  if (m.fields.includes('weight') && (set.weightKg || 0) > 0) {
    if (set.weightKg > prev.maxWeightKg) return true;
    if (set.reps && e1rm(set.weightKg, set.reps) > prev.bestE1rm + 1e-9) return true;
  }
  if (m.fields.includes('reps') && !m.fields.includes('weight')) return (set.reps || 0) > prev.maxReps;
  if (m.bodyweight && !(set.weightKg > 0)) return (set.reps || 0) > prev.maxReps;
  if (m.fields.includes('distance')) return (set.distanceM || 0) > prev.maxDistanceM;
  if (m.fields.includes('duration')) return (set.durationSec || 0) > prev.maxDurationSec;
  return false;
}

/** Peso massimo sollevato per almeno N ripetizioni (per la precompilazione "dal massimo"). */
export function maxWeightForReps(exerciseId, minReps) {
  let best = null;
  let bestAny = null;
  for (const sess of repo.listSessions()) {
    for (const e of sess.entries) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of e.sets) {
        if (!s.done || s.warmup || s.weightKg == null) continue;
        if (bestAny == null || s.weightKg > bestAny) bestAny = s.weightKg;
        if ((s.reps || 0) >= (minReps || 0) && (best == null || s.weightKg > best)) best = s.weightKg;
      }
    }
  }
  return best ?? bestAny;
}
