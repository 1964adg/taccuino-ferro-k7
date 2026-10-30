// Logica dell'allenamento: scelta del giorno, avvio, precompilazione, serie, chiusura.

import { get } from '../config.js';
import { uid, now, sameDay } from '../util.js';
import * as repo from './repo.js';
import { expandTargets, restFor, newSetRecord, measureOf, newItem } from './model.js';
import * as stats from './stats.js';

// ---- Scelta del giorno di oggi ----

/**
 * Giorno proposto: quello associato al giorno della settimana corrente,
 * altrimenti quello che segue l'ultimo svolto nella scheda attiva.
 */
export function suggestDay(program, date = new Date()) {
  const days = repo.sortedDays(program);
  if (!days.length) return null;
  const weekday = date.getDay();
  const scheduled = days.find((d) => (d.weekdays || []).includes(weekday));
  if (scheduled) return { day: scheduled, reason: 'scheduled' };

  const last = repo.listSessions().find((s) => s.programId === program.id);
  if (last) {
    const idx = days.findIndex((d) => d.id === last.dayId);
    if (idx >= 0) return { day: days[(idx + 1) % days.length], reason: 'rotation' };
  }
  return { day: days[0], reason: 'rotation' };
}

export function isTrainingWeekday(date = new Date()) {
  return get('training.weekdays').includes(date.getDay());
}

// ---- Avvio ----

function entryFromItem(item) {
  const ex = repo.getExercise(item.exerciseId);
  const targets = expandTargets(item);
  return {
    id: uid(),
    exerciseId: item.exerciseId,
    itemId: item.id,
    targets,                     // copia dei valori previsti al momento dell'avvio
    plannedSets: targets.length,
    restSec: restFor(item, ex),
    skipped: false,
    extra: false,
    sets: [],
  };
}

export async function startSession(program, day) {
  const session = {
    id: uid(),
    programId: program ? program.id : null,
    dayId: day ? day.id : null,
    dayName: day ? day.name : '',
    startedAt: now(),
    endedAt: null,
    notes: '',
    bodyweightKg: null,
    status: 'active',
    currentIndex: 0,
    rest: null,                  // { startedAt, endAt, entryId } se il recupero è in corso
    entries: day ? day.items.map(entryFromItem) : [],
    createdAt: now(),
    updatedAt: now(),
  };
  await repo.saveActive(session);
  return session;
}

// ---- Precompilazione ----

/** Valori previsti per la serie i (anche oltre quelle pianificate). */
export function targetFor(entry, i) {
  const t = entry.targets[Math.min(i, entry.targets.length - 1)];
  if (t) return { ...t, warmup: i < entry.targets.length ? t.warmup : false };
  return {
    repsMin: get('workout.defaultRepsMin'),
    repsMax: get('workout.defaultRepsMax'),
    weightKg: null, durationSec: null, distanceM: null, warmup: false,
  };
}

function planReps(t) {
  return get('workout.rangePrefill') === 'min' ? t.repsMin : (t.repsMax ?? t.repsMin);
}

/** Valori proposti per la serie i secondo la regola scelta nelle impostazioni. */
export function prefill(session, entry, i) {
  const ex = repo.getExercise(entry.exerciseId);
  const m = measureOf(ex);
  const t = targetFor(entry, i);
  const plan = {
    weightKg: t.weightKg ?? (m.bodyweight ? 0 : get('workout.defaultWeightKg')),
    reps: planReps(t) ?? get('workout.defaultRepsMax'),
    durationSec: t.durationSec ?? get('workout.defaultDurationSec'),
    distanceM: t.distanceM ?? get('workout.defaultDistanceM'),
    warmup: t.warmup,
  };

  // La serie appena fatta ha la precedenza (se hai cambiato peso, la successiva lo segue)
  const prevDone = entry.sets[i - 1];
  if (get('workout.carryOver') && prevDone && prevDone.done && !t.warmup && !prevDone.warmup) {
    return {
      weightKg: prevDone.weightKg ?? plan.weightKg,
      reps: prevDone.reps ?? plan.reps,
      durationSec: prevDone.durationSec ?? plan.durationSec,
      distanceM: prevDone.distanceM ?? plan.distanceM,
      warmup: t.warmup,
    };
  }

  const rule = get('workout.prefill');
  if (rule === 'last') {
    const last = stats.lastPerformance(entry.exerciseId, session.id);
    if (last) {
      // Stessa posizione fra le serie dello stesso tipo (riscaldamento o allenanti)
      const same = last.sets.filter((s) => !!s.warmup === !!t.warmup);
      const pool = same.length ? same : last.sets;
      const nth = t.warmup ? i : i - entry.targets.filter((x) => x.warmup).length;
      const src = pool[Math.min(Math.max(0, nth), pool.length - 1)];
      return {
        weightKg: src.weightKg ?? plan.weightKg,
        reps: src.reps ?? plan.reps,
        durationSec: src.durationSec ?? plan.durationSec,
        distanceM: src.distanceM ?? plan.distanceM,
        warmup: t.warmup,
      };
    }
  } else if (rule === 'max' && m.usesWeight && !t.warmup) {
    const w = stats.maxWeightForReps(entry.exerciseId, plan.reps);
    if (w != null) return { ...plan, weightKg: w };
  }
  return plan;
}

// ---- Serie ----

export function isEntryComplete(entry) {
  return entry.skipped || entry.sets.length >= entry.plannedSets;
}

export function isSessionComplete(session) {
  return session.entries.length > 0 && session.entries.every(isEntryComplete);
}

/** Registra la serie corrente. Restituisce informazioni per l'interfaccia. */
export async function completeSet(session, entry, values) {
  const ex = repo.getExercise(entry.exerciseId);
  const set = newSetRecord(values);
  const prev = stats.bests(entry.exerciseId, {
    excludeSessionId: session.id,
    extraSets: session.entries.filter((e) => e.exerciseId === entry.exerciseId).flatMap((e) => e.sets),
  });
  set.pr = get('workout.showRecords') && stats.isRecord(set, ex, prev);
  entry.sets.push(set);
  if (entry.skipped) entry.skipped = false;

  const entryDone = isEntryComplete(entry);
  const sessionDone = isSessionComplete(session);
  let restSec = 0;
  if (get('timer.autoStart') && !sessionDone && (!entryDone || get('timer.restAfterLastSet'))) {
    restSec = entry.restSec ?? get('timer.defaultRestSec');
  }
  await repo.saveActive(session);
  return { set, isRecord: set.pr, entryDone, sessionDone, restSec };
}

export async function undoLastSet(session, entry) {
  const removed = entry.sets.pop() || null;
  if (removed) await repo.saveActive(session);
  return removed;
}

export async function restoreSet(session, entry, set) {
  entry.sets.push(set);
  await repo.saveActive(session);
}

export async function updateSet(session, entry, setId, values) {
  const s = entry.sets.find((x) => x.id === setId);
  if (!s) return;
  Object.assign(s, values);
  await repo.saveActive(session);
}

export async function deleteSet(session, entry, setId) {
  entry.sets = entry.sets.filter((x) => x.id !== setId);
  await repo.saveActive(session);
}

export async function addExtraSet(session, entry) {
  entry.plannedSets += 1;
  entry.skipped = false;
  await repo.saveActive(session);
}

export async function toggleSkip(session, entry) {
  entry.skipped = !entry.skipped;
  await repo.saveActive(session);
}

/** Aggiunge al volo un esercizio fuori scheda subito dopo quello corrente. */
export async function addExerciseToSession(session, exerciseId) {
  const item = newItem(exerciseId, {});
  const entry = entryFromItem(item);
  entry.itemId = null;
  entry.extra = true;
  session.entries.splice(session.currentIndex + 1, 0, entry);
  session.currentIndex += 1;
  await repo.saveActive(session);
  return entry;
}

export async function setCurrentIndex(session, idx) {
  session.currentIndex = Math.max(0, Math.min(idx, session.entries.length - 1));
  await repo.saveActive(session);
}

/** Primo esercizio non completato dopo (o prima di) quello corrente. */
export function nextIncompleteIndex(session) {
  const n = session.entries.length;
  for (let k = 1; k <= n; k++) {
    const i = (session.currentIndex + k) % n;
    if (!isEntryComplete(session.entries[i])) return i;
  }
  return -1;
}

export async function setRest(session, rest) {
  session.rest = rest;
  await repo.saveActive(session);
}

// ---- Chiusura ----

export async function finishSession(session, { notes = '', bodyweightKg = null } = {}) {
  const done = { ...session };
  done.endedAt = now();
  done.durationSec = Math.round((done.endedAt - done.startedAt) / 1000);
  done.notes = notes;
  done.bodyweightKg = bodyweightKg;
  done.status = 'done';
  delete done.rest;
  delete done.currentIndex;
  // Si tengono solo le serie effettivamente fatte
  done.entries = done.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }));
  if (bodyweightKg) {
    const existing = repo.listBodyweight().find((b) => sameDay(b.date, done.startedAt));
    const rec = existing || { id: uid(), createdAt: now() };
    rec.date = done.startedAt;
    rec.kg = bodyweightKg;
    await repo.saveBodyweight(rec);
  }
  await repo.saveSession(done);
  await repo.clearActive();
  return done;
}

export async function discardSession() {
  await repo.clearActive();
}
