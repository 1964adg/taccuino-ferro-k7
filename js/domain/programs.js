// Operazioni su schede, giorni e voci: creazione, copia, riordino, archiviazione.

import { t } from '../config.js';
import { uid, now, clone } from '../util.js';
import * as repo from './repo.js';
import { newProgram, newDay, newItem, newExercise } from './model.js';

/** Sposta un elemento di un array dalla posizione "from" alla posizione "to". */
export function moveInArray(arr, from, to) {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
  return arr;
}

/** Riassegna "order" ai giorni seguendo l'ordine attuale. */
function renumberDays(program) {
  repo.sortedDays(program, { includeArchived: true }).forEach((d, i) => { d.order = i; });
}

function freshIds(obj) {
  const t0 = now();
  obj.id = uid();
  obj.createdAt = t0;
  obj.updatedAt = t0;
  return obj;
}

// ---- Schede ----

export async function createProgram(name) {
  const p = newProgram({ name, active: !repo.getActiveProgram() });
  await repo.saveProgram(p);
  return p;
}

export async function duplicateProgram(program) {
  const copy = freshIds(clone(program));
  copy.name = program.name + t('copySuffix');
  copy.active = false;
  copy.archived = false;
  copy.days.forEach((d) => {
    freshIds(d);
    d.items.forEach(freshIds);
  });
  await repo.saveProgram(copy);
  return copy;
}

export async function setArchivedProgram(program, archived) {
  program.archived = archived;
  if (archived) program.active = false;
  await repo.saveProgram(program);
}

// ---- Giorni ----

export async function addDay(program, name) {
  const d = newDay({ name, order: program.days.length });
  program.days.push(d);
  renumberDays(program);
  await repo.saveProgram(program);
  return d;
}

export async function duplicateDay(program, day) {
  const copy = freshIds(clone(day));
  copy.name = day.name + t('copySuffix');
  copy.weekdays = [];
  copy.items.forEach(freshIds);
  copy.order = day.order + 0.5;
  program.days.push(copy);
  renumberDays(program);
  await repo.saveProgram(program);
  return copy;
}

export async function deleteDay(program, dayId) {
  program.days = program.days.filter((d) => d.id !== dayId);
  renumberDays(program);
  await repo.saveProgram(program);
}

/** Riordina i giorni visibili (quelli archiviati restano in fondo). */
export async function reorderDays(program, from, to) {
  const visible = repo.sortedDays(program);
  const archived = program.days.filter((d) => d.archived).sort((a, b) => a.order - b.order);
  moveInArray(visible, from, to);
  [...visible, ...archived].forEach((d, i) => { d.order = i; });
  await repo.saveProgram(program);
}

export async function setArchivedDay(program, day, archived) {
  day.archived = archived;
  await repo.saveProgram(program);
}

// ---- Voci (esercizi dentro un giorno) ----

export async function addItem(program, day, exerciseId) {
  const it = newItem(exerciseId, {});
  day.items.push(it);
  await repo.saveProgram(program);
  return it;
}

export async function duplicateItem(program, day, item) {
  const copy = freshIds(clone(item));
  day.items.splice(day.items.indexOf(item) + 1, 0, copy);
  await repo.saveProgram(program);
  return copy;
}

export async function removeItem(program, day, itemId) {
  const idx = day.items.findIndex((x) => x.id === itemId);
  if (idx < 0) return null;
  const [removed] = day.items.splice(idx, 1);
  await repo.saveProgram(program);
  return { removed, idx };
}

export async function restoreItem(program, day, removed, idx) {
  day.items.splice(Math.min(idx, day.items.length), 0, removed);
  await repo.saveProgram(program);
}

export async function reorderItems(program, day, from, to) {
  moveInArray(day.items, from, to);
  await repo.saveProgram(program);
}

// ---- Libreria esercizi ----

export async function duplicateExercise(ex) {
  const copy = newExercise({ ...ex, name: ex.name + t('copySuffix') });
  await repo.saveExercise(copy);
  return copy;
}

/** Elimina un esercizio solo se non è usato in schede né nello storico. */
export async function tryDeleteExercise(ex) {
  const used = repo.exerciseUsageCount(ex.id);
  if (used > 0) return { ok: false, reason: 'inUse', n: used };
  if (repo.exerciseHasHistory(ex.id)) return { ok: false, reason: 'history' };
  await repo.deleteExercise(ex.id);
  return { ok: true };
}
