// Cronologia e progressi: periodi, filtri, serie di valori per i grafici, riepiloghi, record.

import { get } from '../config.js';
import { uid, now, startOfDay } from '../util.js';
import * as repo from './repo.js';
import { measureOf } from './model.js';
import * as stats from './stats.js';

const DAY_MS = 86400000;

// ---- Periodi ----

/** Inizio della settimana che contiene ts (rispetta il primo giorno scelto). */
export function weekStart(ts) {
  const d = new Date(startOfDay(ts));
  const first = get('dates.firstDayOfWeek');
  const diff = (d.getDay() - first + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export function monthStart(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function addPeriod(ts, kind, n) {
  const d = new Date(ts);
  if (kind === 'week') d.setDate(d.getDate() + 7 * n);
  else d.setMonth(d.getMonth() + n);
  return d.getTime();
}

/** Ultimi N periodi (settimane o mesi), dal più vecchio al più recente: [{start, end}]. */
export function lastPeriods(kind, n, ref = Date.now()) {
  const cur = kind === 'week' ? weekStart(ref) : monthStart(ref);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = addPeriod(cur, kind, -i);
    out.push({ start, end: addPeriod(start, kind, 1) });
  }
  return out;
}

/** Inizio del periodo di filtro ("ultimi N giorni"; 0 = tutto). */
export function periodFrom(days) {
  return days > 0 ? startOfDay(Date.now() - (days - 1) * DAY_MS) : 0;
}

// ---- Filtri ----

/** Sessioni concluse che rispettano i filtri, dalla più recente. */
export function filterSessions({ from = 0, to = Infinity, dayName = null, exerciseId = null } = {}) {
  return repo.listSessions().filter((s) =>
    s.startedAt >= from && s.startedAt < to
    && (!dayName || s.dayName === dayName)
    && (!exerciseId || s.entries.some((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done))));
}

/** Nomi dei giorni presenti nello storico (per il filtro). */
export function dayNamesInHistory() {
  const set = new Set(repo.listSessions().map((s) => s.dayName).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, get('app.locale')));
}

/** Esercizi con almeno una serie registrata, dal più recente. */
export function exercisesWithHistory() {
  const map = new Map();
  for (const s of repo.listSessions()) {
    for (const e of s.entries) {
      if (!e.sets.some((x) => x.done)) continue;
      const cur = map.get(e.exerciseId);
      if (cur) { cur.count++; continue; }
      const ex = repo.getExercise(e.exerciseId);
      if (ex) map.set(e.exerciseId, { exercise: ex, lastTs: s.startedAt, count: 1 });
    }
  }
  return [...map.values()];
}

// ---- Riepiloghi ----

/** Giorni di allenamento abilitati tra start ed end (esclusa la parte futura). */
function plannedDays(start, end) {
  const enabled = get('training.weekdays');
  const limit = Math.min(end, startOfDay(Date.now()) + DAY_MS);
  let n = 0;
  for (let t = start; t < limit; t += DAY_MS) {
    // Si usa il mezzogiorno per non cadere sul cambio dell'ora legale
    if (enabled.includes(new Date(t + DAY_MS / 2).getDay())) n++;
  }
  return n;
}

export function periodSummary(start, end) {
  const sessions = filterSessions({ from: start, to: end });
  let volume = 0;
  let sets = 0;
  let durationSec = 0;
  const days = new Set();
  for (const s of sessions) {
    const sum = stats.sessionSummary(s);
    volume += sum.volume;
    sets += sum.setsDone;
    durationSec += s.durationSec || sum.durationSec;
    days.add(startOfDay(s.startedAt));
  }
  const planned = plannedDays(start, end);
  return {
    start, end,
    workouts: sessions.length,
    trainedDays: days.size,
    planned,
    // Costanza: giorni allenati rispetto ai giorni abilitati (massimo 100%)
    consistency: planned > 0 ? Math.min(1, days.size / planned) : null,
    volume, sets, durationSec,
  };
}

// ---- Serie di valori per esercizio ----

/** Metriche disponibili per il tipo di misurazione dell'esercizio. */
export function metricsFor(exercise) {
  const m = measureOf(exercise);
  const out = [];
  if (m.fields.includes('weight')) out.push('e1rm', 'maxWeight');
  if (m.fields.includes('reps')) out.push('volume', 'maxReps', 'totalReps');
  if (m.fields.includes('duration')) out.push('maxDuration');
  if (m.fields.includes('distance')) out.push('maxDistance');
  return [...new Set(out)];
}

/** Valore della metrica nelle serie di una sessione (riscaldamento escluso). */
function metricValue(metric, sets, exercise, bw) {
  const work = sets.filter((s) => s.done && !s.warmup);
  if (!work.length) return null;
  switch (metric) {
    case 'e1rm': return Math.max(...work.map((s) => stats.e1rm(s.weightKg || 0, s.reps || 0)));
    case 'maxWeight': return Math.max(...work.map((s) => s.weightKg || 0));
    case 'volume': return work.reduce((n, s) => n + stats.setVolume(s, exercise, bw), 0);
    case 'maxReps': return Math.max(...work.map((s) => s.reps || 0));
    case 'totalReps': return work.reduce((n, s) => n + (s.reps || 0), 0);
    case 'maxDuration': return Math.max(...work.map((s) => s.durationSec || 0));
    case 'maxDistance': return Math.max(...work.map((s) => s.distanceM || 0));
    default: return null;
  }
}

/** Punti {x: data, y: valore, sessionId} dal più vecchio al più recente. */
export function exerciseSeries(exerciseId, metric, { from = 0 } = {}) {
  const ex = repo.getExercise(exerciseId);
  const points = [];
  for (const s of filterSessions({ from, exerciseId })) {
    const sets = s.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets);
    const y = metricValue(metric, sets, ex, stats.sessionBodyweight(s));
    if (y != null && y > 0) points.push({ x: s.startedAt, y, sessionId: s.id });
  }
  return points.reverse();
}

/** Record personali completi di un esercizio, con la data in cui sono stati fatti. */
export function exerciseRecords(exerciseId) {
  const ex = repo.getExercise(exerciseId);
  const rec = {};
  const better = (key, value, ts, extra = {}) => {
    if (value > 0 && (!rec[key] || value > rec[key].value)) rec[key] = { value, ts, ...extra };
  };
  for (const s of repo.listSessions()) {
    const sets = s.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets).filter((x) => x.done && !x.warmup);
    if (!sets.length) continue;
    for (const x of sets) {
      better('maxWeight', x.weightKg || 0, s.startedAt, { reps: x.reps });
      better('e1rm', stats.e1rm(x.weightKg || 0, x.reps || 0), s.startedAt, { weightKg: x.weightKg, reps: x.reps });
      better('maxReps', x.reps || 0, s.startedAt, { weightKg: x.weightKg });
      better('maxDuration', x.durationSec || 0, s.startedAt);
      better('maxDistance', x.distanceM || 0, s.startedAt);
    }
    better('bestVolume', metricValue('volume', sets, ex, stats.sessionBodyweight(s)) || 0, s.startedAt);
  }
  return rec;
}

// ---- Ricalcolo dei record dopo una modifica dello storico ----

/**
 * Ripercorre lo storico in ordine di data e ricalcola il segno "record" di ogni serie.
 * Va chiamato dopo aver modificato o eliminato sessioni passate.
 */
export async function recomputeRecords() {
  const sessions = [...repo.listSessions()].sort((a, b) => a.startedAt - b.startedAt);
  const prev = new Map(); // exerciseId → migliori finora
  const changed = [];
  for (const s of sessions) {
    let dirty = false;
    for (const e of s.entries) {
      const ex = repo.getExercise(e.exerciseId);
      let b = prev.get(e.exerciseId);
      for (const set of e.sets) {
        const isPr = !!(b && stats.isRecord(set, ex, b));
        if (!!set.pr !== isPr) { set.pr = isPr; dirty = true; }
        // Aggiorna i migliori includendo questa serie
        b = mergeBest(b, set);
      }
      if (b) prev.set(e.exerciseId, b);
    }
    if (dirty) changed.push(s);
  }
  await repo.saveSessionsBulk(changed);
  return changed.length;
}

function mergeBest(b, s) {
  const out = b ? { ...b } : { maxWeightKg: 0, maxWeightReps: 0, bestE1rm: 0, maxReps: 0, maxDurationSec: 0, maxDistanceM: 0, count: 0 };
  if (!s.done || s.warmup) return out;
  out.count++;
  const w = s.weightKg || 0;
  const r = s.reps || 0;
  if (w > out.maxWeightKg || (w === out.maxWeightKg && r > out.maxWeightReps)) { out.maxWeightKg = w; out.maxWeightReps = r; }
  out.bestE1rm = Math.max(out.bestE1rm, stats.e1rm(w, r));
  out.maxReps = Math.max(out.maxReps, r);
  out.maxDurationSec = Math.max(out.maxDurationSec, s.durationSec || 0);
  out.maxDistanceM = Math.max(out.maxDistanceM, s.distanceM || 0);
  return out;
}

// ---- Modifiche a una sessione passata ----

export async function updateSession(session) {
  if (session.startedAt && session.durationSec != null) session.endedAt = session.startedAt + session.durationSec * 1000;
  await repo.saveSession(session);
  await recomputeRecords();
}

export async function removeSession(id) {
  await repo.deleteSession(id);
  await recomputeRecords();
}

/** Nuova serie aggiunta a mano nello storico. */
export function newHistorySet(values) {
  return {
    id: uid(), weightKg: values.weightKg ?? null, reps: values.reps ?? null,
    durationSec: values.durationSec ?? null, distanceM: values.distanceM ?? null,
    warmup: !!values.warmup, done: true, note: '', completedAt: now(), pr: false,
  };
}

// ---- Peso corporeo ----

export function bodyweightSeries({ from = 0 } = {}) {
  return repo.listBodyweight().filter((b) => b.date >= from).map((b) => ({ x: b.date, y: b.kg, id: b.id })).reverse();
}
