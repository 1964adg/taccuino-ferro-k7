// Modello dati: costruttori dei record e regole sui tipi di misurazione.

import { get } from '../config.js';
import { uid, now } from '../util.js';

/** Tipi di misurazione e campi che ciascuno registra. */
export const MEASURES = {
  weight_reps:     { fields: ['weight', 'reps'], usesWeight: true },
  reps:            { fields: ['reps'], usesWeight: false },
  bodyweight_plus: { fields: ['weight', 'reps'], usesWeight: true, bodyweight: true },
  time:            { fields: ['duration'], usesWeight: false },
  distance_time:   { fields: ['distance', 'duration'], usesWeight: false },
};

export const measureOf = (exercise) => MEASURES[exercise && exercise.measure] || MEASURES.weight_reps;

function stamp(obj) {
  const t = now();
  return { id: uid(), createdAt: t, updatedAt: t, ...obj };
}

export function touch(obj) {
  obj.updatedAt = now();
  return obj;
}

export function newExercise({ name, muscleGroup = '', measure = 'weight_reps', restSec = null, notes = '' }) {
  return stamp({ name, muscleGroup, measure, restSec, notes, archived: false });
}

export function newProgram({ name, notes = '', active = false }) {
  return stamp({ name, notes, active, archived: false, days: [] });
}

export function newDay({ name, weekdays = [], order = 0 }) {
  return stamp({ name, weekdays, order, items: [] });
}

/**
 * Voce di un giorno di allenamento: un esercizio della libreria con i valori previsti.
 * custom[i] (facoltativo) personalizza la serie i, es. { repsMin: 12, weightKg: 40, warmup: true }.
 */
export function newItem(exerciseId, opts = {}) {
  return stamp({
    exerciseId,
    sets: opts.sets ?? get('workout.defaultSets'),
    repsMin: opts.repsMin ?? get('workout.defaultRepsMin'),
    repsMax: opts.repsMax ?? opts.repsMin ?? get('workout.defaultRepsMax'),
    weightKg: opts.weightKg ?? null,
    durationSec: opts.durationSec ?? null,
    distanceM: opts.distanceM ?? null,
    restSec: opts.restSec ?? null,      // null = usa quello dell'esercizio o quello generale
    warmupSets: opts.warmupSets ?? 0,   // le prime N serie sono di riscaldamento
    custom: opts.custom ?? [],
    notes: opts.notes ?? '',
  });
}

/** Elenco delle serie previste di una voce, ciascuna con i propri valori. */
export function expandTargets(item) {
  const out = [];
  const n = Math.max(0, item.sets || 0);
  for (let i = 0; i < n; i++) {
    const c = (item.custom && item.custom[i]) || {};
    out.push({
      repsMin: c.repsMin ?? item.repsMin,
      repsMax: c.repsMax ?? c.repsMin ?? item.repsMax,
      weightKg: c.weightKg ?? item.weightKg,
      durationSec: c.durationSec ?? item.durationSec,
      distanceM: c.distanceM ?? item.distanceM,
      warmup: c.warmup ?? i < (item.warmupSets || 0),
    });
  }
  return out;
}

/** Recupero effettivo: voce > esercizio > impostazione generale. */
export function restFor(item, exercise) {
  if (item && Number.isFinite(item.restSec)) return item.restSec;
  if (exercise && Number.isFinite(exercise.restSec)) return exercise.restSec;
  return get('timer.defaultRestSec');
}

/** Serie eseguita. */
export function newSetRecord(values) {
  return {
    id: uid(),
    weightKg: values.weightKg ?? null,
    reps: values.reps ?? null,
    durationSec: values.durationSec ?? null,
    distanceM: values.distanceM ?? null,
    warmup: !!values.warmup,
    done: true,
    note: values.note ?? '',
    completedAt: now(),
    pr: false,
  };
}
