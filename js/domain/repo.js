// Archivio in memoria dei dati di dominio, sincronizzato con db.js.
// L'interfaccia legge da qui (veloce, sincrono) e salva tramite queste funzioni.

import * as db from '../db.js';
import { get } from '../config.js';
import { newExercise, newProgram, newDay, newItem, touch } from './model.js';

const S = db.STORES;

const state = {
  exercises: new Map(),
  programs: new Map(),
  sessions: [],          // ordinate dalla più recente
  bodyweight: [],        // ordinate dalla più recente
  active: null,
};

export async function loadAll() {
  const [ex, pr, se, bw, act] = await Promise.all([
    db.getAll(S.exercises), db.getAll(S.programs), db.getAll(S.sessions),
    db.getAll(S.bodyweight), db.get(S.active, 'current'),
  ]);
  state.exercises = new Map(ex.map((e) => [e.id, e]));
  state.programs = new Map(pr.map((p) => [p.id, p]));
  state.sessions = se.sort((a, b) => b.startedAt - a.startedAt);
  state.bodyweight = bw.sort((a, b) => b.date - a.date);
  state.active = (act && act.session) || null;
}

// ---- Esercizi ----

export const getExercise = (id) => state.exercises.get(id) || null;

export function listExercises({ includeArchived = false } = {}) {
  return [...state.exercises.values()]
    .filter((e) => includeArchived || !e.archived)
    .sort((a, b) => a.name.localeCompare(b.name, get('app.locale')));
}

export async function saveExercise(ex) {
  touch(ex);
  await db.put(S.exercises, ex);
  state.exercises.set(ex.id, ex);
  return ex;
}

// ---- Schede ----

export const getProgram = (id) => state.programs.get(id) || null;

export function listPrograms({ includeArchived = false } = {}) {
  return [...state.programs.values()]
    .filter((p) => includeArchived || !p.archived)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function getActiveProgram() {
  return listPrograms().find((p) => p.active) || null;
}

export async function saveProgram(p) {
  touch(p);
  await db.put(S.programs, p);
  state.programs.set(p.id, p);
  return p;
}

/** Giorni in ordine; quelli archiviati sono esclusi salvo richiesta. */
export function sortedDays(program, { includeArchived = false } = {}) {
  if (!program) return [];
  return program.days
    .filter((d) => includeArchived || !d.archived)
    .sort((a, b) => a.order - b.order);
}

export async function deleteProgram(id) {
  await db.remove(S.programs, id);
  state.programs.delete(id);
}

/** Rende attiva una scheda e disattiva le altre (una sola attiva alla volta). */
export async function setActiveProgram(id) {
  for (const p of state.programs.values()) {
    const should = p.id === id;
    if (!!p.active !== should) {
      p.active = should;
      await saveProgram(p);
    }
  }
}

// ---- Uso degli esercizi ----

/** Quanti giorni di allenamento (in tutte le schede) usano l'esercizio. */
export function exerciseUsageCount(exerciseId) {
  let n = 0;
  for (const p of state.programs.values()) {
    for (const d of p.days) if (d.items.some((it) => it.exerciseId === exerciseId)) n++;
  }
  return n;
}

export function exerciseHasHistory(exerciseId) {
  const inSessions = state.sessions.some((s) => s.entries.some((e) => e.exerciseId === exerciseId));
  const inActive = !!(state.active && state.active.entries.some((e) => e.exerciseId === exerciseId));
  return inSessions || inActive;
}

export async function deleteExercise(id) {
  await db.remove(S.exercises, id);
  state.exercises.delete(id);
}

/** Gruppi muscolari già usati (per i suggerimenti). */
export function muscleGroups() {
  const set = new Set();
  for (const e of state.exercises.values()) if (e.muscleGroup) set.add(e.muscleGroup);
  return [...set].sort((a, b) => a.localeCompare(b, get('app.locale')));
}

/** Cerca un esercizio per nome, senza distinguere maiuscole e spazi. */
export function findExerciseByName(name) {
  const key = normalizeName(name);
  for (const e of state.exercises.values()) if (normalizeName(e.name) === key) return e;
  return null;
}

export function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---- Sessioni concluse ----

export const listSessions = () => state.sessions;
export const getSession = (id) => state.sessions.find((s) => s.id === id) || null;

export async function saveSession(session) {
  touch(session);
  await db.put(S.sessions, session);
  state.sessions = [session, ...state.sessions.filter((s) => s.id !== session.id)]
    .sort((a, b) => b.startedAt - a.startedAt);
  return session;
}

/** Salva più sessioni in una sola transazione (es. dopo il ricalcolo dei record). */
export async function saveSessionsBulk(sessions) {
  if (!sessions.length) return;
  await db.putMany(S.sessions, sessions);
}

export async function deleteSession(id) {
  await db.remove(S.sessions, id);
  state.sessions = state.sessions.filter((s) => s.id !== id);
}

// ---- Allenamento in corso ----

export const getActive = () => state.active;

export async function saveActive(session) {
  touch(session);
  await db.put(S.active, { id: 'current', session });
  state.active = session;
}

export async function clearActive() {
  await db.remove(S.active, 'current');
  state.active = null;
}

// ---- Peso corporeo ----

export const listBodyweight = () => state.bodyweight;
export const latestBodyweight = () => state.bodyweight[0] || null;

export async function saveBodyweight(rec) {
  touch(rec);
  await db.put(S.bodyweight, rec);
  state.bodyweight = [rec, ...state.bodyweight.filter((b) => b.id !== rec.id)]
    .sort((a, b) => b.date - a.date);
}

export async function deleteBodyweight(id) {
  await db.remove(S.bodyweight, id);
  state.bodyweight = state.bodyweight.filter((b) => b.id !== id);
}

// ---- Primo avvio: scheda di esempio dalla configurazione ----

export async function seedSampleIfNeeded() {
  if (await db.getMeta('seeded', false)) return false;
  const sample = get('sampleProgram');
  const program = newProgram({ name: sample.name, notes: sample.notes, active: true });
  const byName = new Map();
  const exercises = [];
  sample.days.forEach((d, i) => {
    const day = newDay({ name: d.name, weekdays: d.weekdays || [], order: i });
    for (const it of d.items) {
      let ex = byName.get(it.exercise);
      if (!ex) {
        ex = newExercise({ name: it.exercise, muscleGroup: it.group || '', measure: it.measure || 'weight_reps' });
        byName.set(it.exercise, ex);
        exercises.push(ex);
      }
      day.items.push(newItem(ex.id, it));
    }
    program.days.push(day);
  });
  await db.putMany(S.exercises, exercises);
  await db.put(S.programs, program);
  await db.setMeta('seeded', true);
  exercises.forEach((e) => state.exercises.set(e.id, e));
  state.programs.set(program.id, program);
  return true;
}
